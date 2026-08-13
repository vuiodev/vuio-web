import type { MediaItem, MediaCategory } from '../api/types';
import { fetchMediaPage, fetchServerInfo } from '../api/client';
import { organizeByFolders, type FolderGroup } from '../utils/pathHelper';

class MediaStore {
	items = $state<MediaItem[]>([]);
	category = $state<MediaCategory>('all');
	searchQuery = $state<string>('');
	isLoading = $state<boolean>(false);
	selectedItem = $state<MediaItem | null>(null);
	viewMode = $state<'grid' | 'list'>('grid');
	nextCursor = $state<string | null>(null);
	currentFolderPath = $state<string[]>([]);
	monitoredDirs = $state<string[]>([]);

	organizedMedia = $derived<{ subfolders: FolderGroup[]; directFiles: MediaItem[] }>(
		organizeByFolders(this.items, this.currentFolderPath, this.monitoredDirs)
	);

	async initServerInfo() {
		try {
			const info = await fetchServerInfo();
			this.monitoredDirs = info.monitored_directories || [];
		} catch {}
	}

	async loadMedia(reset = true) {
		this.isLoading = true;
		try {
			const cursor = reset ? null : this.nextCursor;
			const data = await fetchMediaPage(this.category, this.searchQuery, cursor);
			if (reset) {
				this.items = data.files;
			} else {
				this.items = [...this.items, ...data.files];
			}
			this.nextCursor = data.next_cursor;
		} catch (error) {
			console.error('Failed to load media:', error);
		} finally {
			this.isLoading = false;
		}
	}

	setCategory(cat: MediaCategory) {
		this.category = cat;
		this.currentFolderPath = [];
		this.loadMedia(true);
	}

	setSearch(query: string) {
		this.searchQuery = query;
		this.currentFolderPath = [];
		this.loadMedia(true);
	}

	navigateFolder(folderPath: string[]) {
		this.currentFolderPath = folderPath;
	}

	goUpFolder() {
		if (this.currentFolderPath.length > 0) {
			this.currentFolderPath = this.currentFolderPath.slice(0, -1);
		}
	}

	clearFolderPath() {
		this.currentFolderPath = [];
	}

	selectItem(item: MediaItem | null) {
		this.selectedItem = item;
	}

	toggleViewMode() {
		this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
	}
}

export const mediaStore = new MediaStore();
