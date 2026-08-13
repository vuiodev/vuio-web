<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import type { FolderEntry } from '$lib/api/types';
	import { Folder, FolderOpen, ChevronRight } from '@lucide/svelte';

	let { folder }: { folder: FolderEntry } = $props();

	// No cover art and no play-all button: both used to be derived from the
	// folder's files, and a card no longer carries them. Fetching them would
	// cost a query per folder on every screen, which is exactly the work that
	// moving the folder listing onto the server removed.
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
		<div class="folder-fallback">
			<Folder size={52} class="folder-icon" />
		</div>

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
