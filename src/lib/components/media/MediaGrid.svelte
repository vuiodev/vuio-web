<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import MediaCard from './MediaCard.svelte';
	import FolderCard from './FolderCard.svelte';
	import FolderShowcase from './FolderShowcase.svelte';
	import { getCoverUrl } from '$lib/api/client';
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { Play, Film, Loader2, Folder, ChevronRight, ArrowLeft } from '@lucide/svelte';

	// Folders and files come from the server, already scoped to one directory.
	// Nothing here groups, sorts or counts the library: on ten million files
	// this component sees the same handful of rows it sees on ten.
	let crumbs = $derived(mediaStore.crumbs);
	let folders = $derived(mediaStore.searching ? [] : mediaStore.folders);
	let files = $derived(mediaStore.visibleFiles);
	let isEmpty = $derived(folders.length === 0 && files.length === 0);

	let currentFolderName = $derived(crumbs.length > 0 ? crumbs[crumbs.length - 1].label : '');

	// Only show the showcase if MediaInfo metadata actually exists
	let hasShowcase = $derived(
		!mediaStore.searching &&
			mediaStore.path !== null &&
			files.some((f) => f.info_art === true || Boolean(f.info_overview))
	);

	function handleRowClick(item: any) {
		mediaStore.selectItem(item);
	}

	function handleRowPlay(e: MouseEvent, item: any) {
		e.stopPropagation();
		if (item.cat === 'audio' || item.cat === 'radio') {
			playerStore.playAudio(item, files);
		} else {
			playerStore.openVideo(item);
		}
	}
</script>

{#if crumbs.length > 0 && !mediaStore.searching}
	<div class="breadcrumb-bar glass-card">
		<button
			class="btn btn-secondary btn-sm"
			onclick={() => mediaStore.goUp()}
			disabled={mediaStore.parent === null && mediaStore.monitoredDirs.length < 2}
		>
			<ArrowLeft size={16} /> Back
		</button>
		<div class="breadcrumbs">
			{#if mediaStore.monitoredDirs.length > 1}
				<button class="breadcrumb-item" onclick={() => mediaStore.goToRoots()}> Libraries </button>
				<ChevronRight size={14} class="crumb-separator" />
			{/if}
			{#each crumbs as crumb, idx (crumb.path)}
				{#if idx > 0}
					<ChevronRight size={14} class="crumb-separator" />
				{/if}
				<button
					class="breadcrumb-item {idx === crumbs.length - 1 ? 'active' : ''}"
					onclick={() => crumb.path && mediaStore.enterFolder(crumb.path)}
				>
					{crumb.label}
				</button>
			{/each}
		</div>
	</div>
{/if}

{#if hasShowcase}
	<!-- Display MediaInfo Showcase on Main Screen when entering a folder with media -->
	<FolderShowcase folderName={currentFolderName} {files} />
{:else if mediaStore.isLoading && isEmpty}
	<div class="loading-state">
		<Loader2 size={36} class="spinner" />
		<span>Scanning VuIO media library...</span>
	</div>
{:else if isEmpty}
	<div class="empty-state glass-card">
		<Film size={48} class="empty-icon" />
		<h3>No Media Found</h3>
		<p>No media files matched your current category or search filter.</p>
	</div>
{:else if mediaStore.viewMode === 'grid'}
	<div class="media-grid">
		{#each folders as folder (folder.path)}
			<FolderCard {folder} />
		{/each}

		{#each files as item (item.id)}
			<MediaCard {item} />
		{/each}
	</div>
{:else}
	<div class="media-list glass-card">
		<table class="list-table">
			<thead>
				<tr>
					<th style="width: 50px;"></th>
					<th>Title / Name</th>
					<th>Artist / Category</th>
					<th>Album</th>
					<th>Format</th>
					<th>Size</th>
					<th style="width: 80px;"></th>
				</tr>
			</thead>
			<tbody>
				{#each folders as folder (folder.path)}
					<tr class="table-row folder-row" onclick={() => mediaStore.enterFolder(folder.path)}>
						<td>
							<Folder size={22} class="text-cyan" />
						</td>
						<td class="cell-title">{folder.name}</td>
						<td class="cell-sub">
							{folder.file_count === null
								? 'Folder'
								: `Folder (${folder.file_count.toLocaleString()} items)`}
						</td>
						<td class="cell-sub">—</td>
						<td><span class="badge badge-violet">DIR</span></td>
						<td class="cell-sub">—</td>
						<td></td>
					</tr>
				{/each}

				{#each files as item (item.id)}
					<tr onclick={() => handleRowClick(item)} class="table-row">
						<td>
							<img
								src={getCoverUrl(item.id)}
								alt=""
								class="table-thumb"
								onerror={(e) => {
									(e.target as HTMLImageElement).style.display = 'none';
								}}
							/>
						</td>
						<td class="cell-title">{item.info_title || item.title || item.name}</td>
						<td class="cell-sub">{item.artist || item.cat.toUpperCase()}</td>
						<td class="cell-sub">{item.album || '—'}</td>
						<td><span class="badge badge-cyan">{item.ext.toUpperCase()}</span></td>
						<td class="cell-sub">{item.size_str}</td>
						<td>
							<button
								class="btn btn-secondary btn-icon icon-sm"
								onclick={(e) => handleRowPlay(e, item)}
							>
								<Play size={14} fill="currentColor" />
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if mediaStore.hasMore}
	<div class="pagination-box">
		<button
			class="btn btn-secondary"
			onclick={() => mediaStore.loadMore()}
			disabled={mediaStore.isLoading}
		>
			{#if mediaStore.isLoading}
				<Loader2 size={16} class="spinner" /> Loading...
			{:else}
				Load More Media
			{/if}
		</button>
	</div>
{/if}

<style>
	.breadcrumb-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 18px;
		margin-bottom: 24px;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.breadcrumb-item {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		transition: var(--transition-smooth);
	}

	.breadcrumb-item:hover {
		color: var(--text-main);
		background: rgba(255, 255, 255, 0.08);
	}

	.breadcrumb-item.active {
		color: var(--accent-cyan);
		font-weight: 700;
	}

	:global(.crumb-separator) {
		color: var(--text-muted);
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 20px;
		width: 100%;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		gap: 14px;
		text-align: center;
		color: var(--text-secondary);
	}

	:global(.spinner) {
		animation: spin 1s linear infinite;
		color: var(--accent-cyan);
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}

	:global(.empty-icon) {
		color: var(--text-muted);
	}

	.media-list {
		overflow-x: auto;
		border-radius: var(--radius-md);
	}

	.list-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.88rem;
	}

	.list-table th {
		padding: 12px 16px;
		background: rgba(0, 0, 0, 0.25);
		color: var(--text-muted);
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.75rem;
		border-bottom: 1px solid var(--border-glass);
	}

	.table-row {
		border-bottom: 1px solid var(--border-glass);
		cursor: pointer;
		transition: var(--transition-smooth);
	}

	.table-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.folder-row {
		background: rgba(0, 164, 220, 0.04);
	}

	.list-table td {
		padding: 10px 16px;
		vertical-align: middle;
	}

	.table-thumb {
		width: 38px;
		height: 38px;
		border-radius: var(--radius-sm);
		object-fit: cover;
	}

	.cell-title {
		font-weight: 700;
		color: var(--text-main);
	}

	.cell-sub {
		color: var(--text-secondary);
	}

	.icon-sm {
		width: 32px;
		height: 32px;
	}

	.pagination-box {
		display: flex;
		justify-content: center;
		margin-top: 32px;
	}
</style>
