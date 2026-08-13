<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { getCoverUrl } from '$lib/api/client';
	import type { FolderGroup } from '$lib/utils/pathHelper';
	import { Folder, Play, FolderOpen } from '@lucide/svelte';

	let { folder }: { folder: FolderGroup } = $props();

	// Only return an item if MediaInfo artwork (info_art) actually exists for this folder
	let coverItem = $derived(() => {
		if (folder.items.length === 0) return null;
		const rich = folder.items.find((i) => i.info_art === true);
		return rich || null;
	});

	let hasCover = $state(true);

	function handleOpenFolder() {
		mediaStore.navigateFolder(folder.fullPath);
	}

	function handlePlayFolder(e: MouseEvent) {
		e.stopPropagation();
		if (folder.items.length > 0) {
			const firstAudio = folder.items.find((i) => i.cat === 'audio' || i.cat === 'radio');
			if (firstAudio) {
				playerStore.playAudio(firstAudio, folder.items);
			} else {
				playerStore.openVideo(folder.items[0]);
			}
		}
	}
</script>

<div
	class="glass-card folder-card"
	role="button"
	tabindex="0"
	onclick={handleOpenFolder}
	onkeydown={(e) => e.key === 'Enter' && handleOpenFolder()}
>
	<div class="thumbnail-wrapper">
		{#if coverItem() && hasCover}
			<img
				src={getCoverUrl(coverItem()!.id)}
				alt={folder.folderName}
				class="cover-art"
				loading="lazy"
				onerror={() => (hasCover = false)}
			/>
		{:else}
			<div class="folder-fallback">
				<Folder size={52} class="folder-icon" />
			</div>
		{/if}

		<div class="hover-overlay">
			<button class="play-folder-btn" onclick={handlePlayFolder} title="Play All in Folder">
				<Play size={22} fill="currentColor" style="margin-left: 2px;" />
			</button>
		</div>

		<div class="folder-badge">
			<FolderOpen size={12} />
			<span>FOLDER</span>
		</div>
	</div>

	<div class="folder-body">
		<span class="folder-name" title={folder.folderName}>{folder.folderName}</span>
		<span class="folder-meta">{folder.fileCount} items</span>
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

	.play-folder-btn {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--accent-cyan), #007bb6);
		color: #ffffff;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 164, 220, 0.6);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.play-folder-btn:hover {
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
