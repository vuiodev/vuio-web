import type { MediaItem } from '../api/types';

export interface FolderGroup {
	folderName: string;
	fullPath: string[];
	fileCount: number;
	items: MediaItem[];
}

export function getPathComponents(pathStr: string): string[] {
	if (!pathStr) return [];
	return pathStr.split(/[/\\]/).filter((segment) => segment.length > 0);
}

/**
 * Strips monitored directory prefixes or common root prefixes to get relative folder components.
 */
export function getRelativeComponents(pathStr: string, monitoredDirs: string[] = []): string[] {
	const allComponents = getPathComponents(pathStr);
	if (monitoredDirs.length === 0) return allComponents;

	for (const monDir of monitoredDirs) {
		const monComps = getPathComponents(monDir);
		if (monComps.every((c, idx) => allComponents[idx] === c)) {
			return allComponents.slice(monComps.length);
		}
	}
	return allComponents;
}

export function organizeByFolders(
	items: MediaItem[],
	currentPath: string[] = [],
	monitoredDirs: string[] = []
): { subfolders: FolderGroup[]; directFiles: MediaItem[] } {
	const subfolderMap = new Map<string, { fullPath: string[]; items: MediaItem[] }>();
	const directFiles: MediaItem[] = [];

	for (const item of items) {
		const comps = getRelativeComponents(item.path, monitoredDirs);

		// Check if this item is inside the current folder path
		let matchesCurrent = true;
		for (let i = 0; i < currentPath.length; i++) {
			if (i >= comps.length - 1 || comps[i] !== currentPath[i]) {
				matchesCurrent = false;
				break;
			}
		}

		if (!matchesCurrent) continue;

		// Check if the file sits directly in this folder or in a subfolder
		const remainingComps = comps.slice(currentPath.length);
		if (remainingComps.length <= 1) {
			// Direct file inside this folder
			directFiles.push(item);
		} else {
			// Inside a subfolder
			const folderName = remainingComps[0];
			const fullSubPath = [...currentPath, folderName];
			const key = folderName;

			if (!subfolderMap.has(key)) {
				subfolderMap.set(key, { fullPath: fullSubPath, items: [] });
			}
			subfolderMap.get(key)!.items.push(item);
		}
	}

	const subfolders: FolderGroup[] = Array.from(subfolderMap.entries()).map(
		([folderName, data]) => ({
			folderName,
			fullPath: data.fullPath,
			fileCount: data.items.length,
			items: data.items
		})
	);

	// Sort subfolders alphabetically
	subfolders.sort((a, b) => a.folderName.localeCompare(b.folderName));

	// Sort direct files by folder/filename if no TMDb info, or TMDb title if present
	directFiles.sort((a, b) => {
		const nameA = a.info_title || a.title || a.name;
		const nameB = b.info_title || b.title || b.name;
		return nameA.localeCompare(nameB);
	});

	return { subfolders, directFiles };
}
