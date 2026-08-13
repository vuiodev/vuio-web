<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { fetchBrowse, getCoverUrl, getMediaStreamUrl } from '$lib/api/client';
	import type { FolderEntry } from '$lib/api/types';
	import { Folder, FolderOpen, ChevronRight } from '@lucide/svelte';

	let { folder }: { folder: FolderEntry } = $props();

	let coverUrl = $state<string | null>(null);
	let hasError = $state<boolean>(false);

	async function findFolderCover(dirPath: string, depth = 0): Promise<string | null> {
		if (depth > 2) return null;
		try {
			const res = await fetchBrowse(dirPath, 'all', 0, 10);
			const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic'];

			if (res.files && res.files.length > 0) {
				// 1. Look for an image file in this directory (poster.jpg, cover.jpg, folder.jpg, or any photo)
				const imageFile = res.files.find(
					(f) =>
						f.cat === 'image' ||
						f.mime?.startsWith('image/') ||
						imageExts.includes(f.ext.toLowerCase())
				);
				if (imageFile) {
					return getMediaStreamUrl(imageFile.id);
				}

				// 2. Look for a media file with scraped info_art
				const richArt = res.files.find((f) => f.info_art);
				if (richArt) {
					return getCoverUrl(richArt.id);
				}

				// 3. Look for any video or audio file with cover
				const mediaFile = res.files.find((f) => f.cat === 'video' || f.cat === 'audio');
				if (mediaFile) {
					return getCoverUrl(mediaFile.id);
				}
			}

			// If this folder has subfolders (e.g. Season 01, Season 02), recurse into subfolders to find artwork
			if (res.folders && res.folders.length > 0) {
				for (const sub of res.folders.slice(0, 3)) {
					const subCover = await findFolderCover(sub.path, depth + 1);
					if (subCover) return subCover;
				}
			}
		} catch {}
		return null;
	}

	$effect(() => {
		let cancelled = false;
		if (!folder.path) return;

		findFolderCover(folder.path).then((url) => {
			if (!cancelled && url) {
				coverUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	function handleOpenFolder() {
		mediaStore.enterFolder(folder.path);
	}

	let itemLabel = $derived(
		folder.file_count === null
			? 'Folder'
			: `${folder.file_count.toLocaleString()} ${folder.file_count === 1 ? 'item' : 'items'}`
	);
</script>

<div
	class="glass-card folder-card"
	role="button"
	tabindex="0"
	onclick={handleOpenFolder}
	onkeydown={(e) => e.key === 'Enter' && handleOpenFolder()}
>
	<div class="thumbnail-wrapper">
		{#if coverUrl && !hasError}
			<img
				src={coverUrl}
				alt={folder.name}
				class="cover-art"
				loading="lazy"
				onerror={() => (hasError = true)}
			/>
		{:else}
			<div class="folder-fallback">
				<Folder size={52} class="folder-icon" />
			</div>
		{/if}

		<div class="hover-overlay">
			<div class="open-folder-btn" title="Open folder">
				<ChevronRight size={22} />
			</div>
		</div>

		<div class="folder-badge">
			<FolderOpen size={12} />
			<span>FOLDER</span>
		</div>
	</div>

	<div class="folder-body">
		<span class="folder-name" title={folder.path}>{folder.name}</span>
		<span class="folder-meta">{itemLabel}</span>
	</div>
</div>

<style>
	.folder-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		cursor: pointer;
		position: relative;
	}

	.thumbnail-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 2/3;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.4);
	}

	.cover-art {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.35s ease;
	}

	.folder-card:hover .cover-art {
		transform: scale(1.06);
	}

	.folder-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(20, 25, 35, 0.9), rgba(11, 14, 20, 0.95));
	}

	:global(.folder-icon) {
		color: var(--accent-cyan);
		transition: transform 0.3s ease;
	}

	.folder-card:hover :global(.folder-icon) {
		transform: scale(1.1);
	}

	.hover-overlay {
		position: absolute;
		inset: 0;
		background: rgba(11, 14, 20, 0.55);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.25s ease;
	}

	.folder-card:hover .hover-overlay {
		opacity: 1;
	}

	.open-folder-btn {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--accent-cyan), #007bb6);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 20px rgba(0, 164, 220, 0.6);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.folder-card:hover .open-folder-btn {
		transform: scale(1.12);
		box-shadow: 0 6px 28px rgba(0, 164, 220, 0.8);
	}

	.folder-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: 4px;
		background: rgba(0, 164, 220, 0.85);
		color: #ffffff;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.5px;
		backdrop-filter: blur(4px);
	}

	.folder-body {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.folder-name {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-main);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.folder-meta {
		font-size: 0.78rem;
		color: var(--text-secondary);
	}
</style>
