<script lang="ts">
	import { onMount } from 'svelte';
	import { radioBroadcastStore } from '$lib/stores/radioBroadcastStore.svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { fetchBrowse, getCoverUrl } from '$lib/api/client';
	import {
		Radio,
		Play,
		Square,
		SkipForward,
		SkipBack,
		Shuffle,
		ListOrdered,
		Repeat,
		FolderTree,
		Users,
		Clock,
		Activity,
		CheckSquare,
		Square as SquareIcon,
		Copy,
		Check,
		ExternalLink,
		Link as LinkIcon
	} from '@lucide/svelte';

	interface DiscoveredFolder {
		name: string;
		path: string;
	}

	let discoveredFolders = $state<DiscoveredFolder[]>([]);
	let isLoadingFolders = $state<boolean>(false);
	let copied = $state<boolean>(false);

	onMount(async () => {
		await radioBroadcastStore.initFromBackend();
		await discoverAllSubfolders();
	});

	async function discoverAllSubfolders() {
		isLoadingFolders = true;
		const folderList: DiscoveredFolder[] = [];

		for (const root of mediaStore.monitoredDirs) {
			folderList.push({ name: root, path: root });
			try {
				const page = await fetchBrowse(root, 'all', 0, 100);
				for (const sub of page.folders) {
					folderList.push({ name: `${basename(root)} / ${sub.name}`, path: sub.path });
					try {
						const deepPage = await fetchBrowse(sub.path, 'all', 0, 50);
						for (const deepSub of deepPage.folders) {
							folderList.push({
								name: `${sub.name} / ${deepSub.name}`,
								path: deepSub.path
							});
						}
					} catch {}
				}
			} catch {}
		}

		discoveredFolders = folderList;
		isLoadingFolders = false;
	}

	function basename(pathStr: string): string {
		const parts = pathStr.split(/[/\\]/).filter(Boolean);
		return parts[parts.length - 1] || pathStr;
	}

	function getStreamUrl(): string {
		if (typeof window === 'undefined') return '/api/radio/broadcast/stream';
		return `${window.location.origin}/api/radio/broadcast/stream`;
	}

	async function copyStreamUrl() {
		try {
			await navigator.clipboard.writeText(getStreamUrl());
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch (e) {
			console.error('Failed to copy stream URL:', e);
		}
	}

	async function handleStart() {
		await radioBroadcastStore.startBroadcast(
			mediaStore.files.length > 0 ? mediaStore.files : mediaStore.visibleFiles
		);
	}

	function handleStop() {
		radioBroadcastStore.stopBroadcast();
	}

	function formatElapsed(totalSecs: number): string {
		const h = Math.floor(totalSecs / 3600);
		const m = Math.floor((totalSecs % 3600) / 60);
		const s = totalSecs % 60;
		if (h > 0) {
			return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
		}
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}
</script>

<div class="radio-studio-container">
	<div class="studio-header glass-card">
		<div class="header-main">
			<div class="icon-circle">
				<Radio size={28} class="text-cyan" />
			</div>
			<div>
				<h2>ICY Radio Broadcast Studio</h2>
				<p class="subtitle">
					Create your live SHOUTcast/Icecast radio station stream with ICY StreamTitle metadata from local audio files.
				</p>
			</div>
		</div>

		<div class="status-indicator-badge {radioBroadcastStore.isBroadcasting ? 'live' : 'offline'}">
			<Activity size={16} />
			<span>{radioBroadcastStore.isBroadcasting ? 'ONLINE • BROADCASTING' : 'OFFLINE'}</span>
		</div>
	</div>

	<div class="studio-grid">
		<!-- Left: Controls & Folder Config -->
		<div class="studio-sidebar glass-card">
			<h3><Radio size={18} /> Station Configuration</h3>

			<div class="form-group">
				<label for="station-name">Station Name</label>
				<input
					id="station-name"
					type="text"
					value={radioBroadcastStore.stationName}
					oninput={(e) => radioBroadcastStore.setStationName((e.target as HTMLInputElement).value)}
					placeholder="e.g. VuIO Chillout FM"
				/>
			</div>

			<div class="form-group">
				<label for="station-genre">Station Genre</label>
				<input
					id="station-genre"
					type="text"
					value={radioBroadcastStore.stationGenre}
					oninput={(e) => radioBroadcastStore.setStationGenre((e.target as HTMLInputElement).value)}
					placeholder="e.g. Rock / Hits / Live Radio"
				/>
			</div>

			<div class="form-group">
				<span class="form-label">Broadcast Sequence Mode</span>
				<div class="mode-selector">
					<button
						class="mode-btn {radioBroadcastStore.playbackMode === 'shuffle' ? 'active' : ''}"
						onclick={() => radioBroadcastStore.setPlaybackMode('shuffle')}
						title="Shuffle / Random"
					>
						<Shuffle size={16} />
						<span>Shuffle</span>
					</button>
					<button
						class="mode-btn {radioBroadcastStore.playbackMode === 'linear' ? 'active' : ''}"
						onclick={() => radioBroadcastStore.setPlaybackMode('linear')}
						title="Linear / In Order"
					>
						<ListOrdered size={16} />
						<span>Linear</span>
					</button>
					<button
						class="mode-btn {radioBroadcastStore.playbackMode === 'loop' ? 'active' : ''}"
						onclick={() => radioBroadcastStore.setPlaybackMode('loop')}
						title="Loop Playlist"
					>
						<Repeat size={16} />
						<span>Loop</span>
					</button>
				</div>
			</div>

			<div class="form-group">
				<div class="folder-header-row">
					<span class="form-label"><FolderTree size={14} /> Select Subfolders to Cast</span>
					{#if radioBroadcastStore.selectedFolders.length > 0}
						<button class="clear-selection-btn" onclick={() => (radioBroadcastStore.selectedFolders = [])}>
							Clear ({radioBroadcastStore.selectedFolders.length})
						</button>
					{/if}
				</div>

				{#if isLoadingFolders}
					<p class="meta-hint">Scanning media library folders...</p>
				{:else if discoveredFolders.length > 0}
					<div class="folders-list">
						{#each discoveredFolders as folder (folder.path)}
							{@const isSelected = radioBroadcastStore.selectedFolders.includes(folder.path)}
							<button
								class="folder-item {isSelected ? 'selected' : ''}"
								onclick={() => radioBroadcastStore.toggleFolderSelection(folder.path)}
							>
								{#if isSelected}
									<CheckSquare size={16} class="text-cyan" />
								{:else}
									<SquareIcon size={16} class="text-muted" />
								{/if}
								<span class="folder-path" title={folder.path}>{folder.name}</span>
							</button>
						{/each}
					</div>
				{:else}
					<p class="meta-hint">All library audio files included by default.</p>
				{/if}
			</div>

			<div class="broadcast-controls">
				{#if !radioBroadcastStore.isBroadcasting}
					<button class="btn btn-primary btn-block" onclick={handleStart}>
						<Play size={18} fill="currentColor" /> Start Station Broadcast
					</button>
				{:else}
					<button class="btn btn-secondary btn-danger btn-block" onclick={handleStop}>
						<Square size={18} fill="currentColor" /> Stop Station Broadcast
					</button>
				{/if}
			</div>
		</div>

		<!-- Right: Live Monitor & ICY Metadata Stream -->
		<div class="studio-main glass-card">
			<div class="monitor-header">
				<h3><Activity size={18} /> Live Broadcast Monitor</h3>
				<div class="stats-pills">
					<span class="stat-pill"><Users size={14} /> {radioBroadcastStore.listenersCount} Listeners</span>
					<span class="stat-pill"><Clock size={14} /> {formatElapsed(radioBroadcastStore.elapsedBroadcastSecs)}</span>
				</div>
			</div>

			{#if radioBroadcastStore.isBroadcasting}
				<div class="stream-url-card">
					<div class="stream-url-info">
						<span class="stream-url-title"><LinkIcon size={14} class="text-cyan" /> LIVE BROADCAST STREAM URL</span>
						<code class="stream-url-code">{getStreamUrl()}</code>
					</div>
					<div class="stream-url-actions">
						<button class="btn btn-secondary btn-sm" onclick={copyStreamUrl}>
							{#if copied}
								<Check size={14} class="text-cyan" /> Link Copied!
							{:else}
								<Copy size={14} /> Copy Link
							{/if}
						</button>
						<a
							href={getStreamUrl()}
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-primary btn-sm"
						>
							<ExternalLink size={14} /> Open Stream
						</a>
					</div>
				</div>
			{/if}

			{#if radioBroadcastStore.isBroadcasting && radioBroadcastStore.currentTrack}
				<div class="now-playing-banner">
					<img
						src={getCoverUrl(radioBroadcastStore.currentTrack.id)}
						alt="Cover"
						class="banner-cover"
						onerror={(e) => {
							(e.target as HTMLImageElement).src =
								'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%2300a4dc" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
						}}
					/>
					<div class="banner-details">
						<span class="now-playing-label">CURRENTLY BROADCASTING</span>
						<h2 class="track-title">
							{radioBroadcastStore.currentTrack.info_title ||
								radioBroadcastStore.currentTrack.title ||
								radioBroadcastStore.currentTrack.name}
						</h2>
						<p class="track-artist">
							{radioBroadcastStore.currentTrack.artist || 'Unknown Artist'}
							{#if radioBroadcastStore.currentTrack.album}
								— {radioBroadcastStore.currentTrack.album}
							{/if}
						</p>

						<div class="track-actions">
							<button
								class="btn btn-secondary btn-sm"
								onclick={() => radioBroadcastStore.prevTrack()}
							>
								<SkipBack size={14} /> Previous Track
							</button>
							<button
								class="btn btn-primary btn-sm"
								onclick={() => radioBroadcastStore.nextTrack()}
							>
								<SkipForward size={14} /> Next Track
							</button>
						</div>
					</div>
				</div>

				<div class="icy-metadata-box">
					<div class="icy-header">
						<span class="icy-title">ICY Stream Protocol Metadata (Header & Interleaving)</span>
						<span class="icy-badge">metaint: 16000 bytes</span>
					</div>
					<pre class="icy-code"><code>icy-name: {radioBroadcastStore.stationName}
icy-genre: {radioBroadcastStore.stationGenre}
icy-pub: 1
icy-br: 320
icy-metaint: 16000

{radioBroadcastStore.icyMetadata}</code></pre>
				</div>

				<div class="queue-preview">
					<h4>Upcoming Track Queue ({radioBroadcastStore.playlistQueue.length} tracks)</h4>
					<div class="queue-list">
						{#each radioBroadcastStore.playlistQueue.slice(radioBroadcastStore.currentTrackIndex + 1, radioBroadcastStore.currentTrackIndex + 6) as item, idx}
							<div class="queue-row">
								<span class="queue-idx">#{idx + 1}</span>
								<span class="queue-name">{item.info_title || item.title || item.name}</span>
								<span class="queue-artist">{item.artist || 'Unknown Artist'}</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="idle-studio-state">
					<Radio size={64} class="text-muted" />
					<h3>Station Offline</h3>
					<p>Select specific subfolders on the left and click <strong>Start Station Broadcast</strong> to stream local MP3/FLAC audio files with live ICY metadata.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.radio-studio-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
	}

	.studio-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
	}

	.header-main {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.icon-circle {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: rgba(0, 164, 220, 0.15);
		border: 1px solid rgba(0, 164, 220, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.subtitle {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-top: 2px;
	}

	.status-indicator-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: var(--radius-full);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.5px;
	}

	.status-indicator-badge.offline {
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-muted);
		border: 1px solid var(--border-glass);
	}

	.status-indicator-badge.live {
		background: rgba(16, 185, 129, 0.2);
		color: var(--accent-emerald);
		border: 1px solid rgba(16, 185, 129, 0.4);
		box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
	}

	.studio-grid {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 20px;
	}

	.studio-sidebar {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 20px;
	}

	.studio-sidebar h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.05rem;
		border-bottom: 1px solid var(--border-glass);
		padding-bottom: 12px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label,
	.form-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.folder-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.clear-selection-btn {
		background: none;
		border: none;
		color: var(--accent-cyan);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.form-group input[type='text'] {
		padding: 10px 14px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.9rem;
		outline: none;
	}

	.form-group input[type='text']:focus {
		border-color: var(--accent-cyan);
	}

	.mode-selector {
		display: flex;
		gap: 6px;
	}

	.mode-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--border-glass);
		color: var(--text-secondary);
		cursor: pointer;
		transition: var(--transition-smooth);
	}

	.mode-btn.active {
		background: rgba(0, 164, 220, 0.2);
		color: var(--accent-cyan);
		border-color: var(--accent-cyan);
	}

	.folders-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 220px;
		overflow-y: auto;
	}

	.folder-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-glass);
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.82rem;
		text-align: left;
	}

	.folder-item.selected {
		background: rgba(0, 164, 220, 0.15);
		color: var(--text-main);
		border-color: var(--accent-cyan);
	}

	.folder-path {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta-hint {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.broadcast-controls {
		margin-top: 10px;
	}

	.btn-block {
		width: 100%;
		justify-content: center;
		padding: 12px;
		font-size: 0.95rem;
	}

	.btn-danger {
		background: rgba(244, 63, 94, 0.2);
		color: var(--accent-rose);
		border-color: rgba(244, 63, 94, 0.4);
	}

	.btn-danger:hover {
		background: rgba(244, 63, 94, 0.35);
	}

	.studio-main {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
	}

	.monitor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-glass);
		padding-bottom: 12px;
	}

	.stream-url-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		border-radius: var(--radius-md);
		background: rgba(0, 164, 220, 0.08);
		border: 1px solid rgba(0, 164, 220, 0.3);
		gap: 16px;
		flex-wrap: wrap;
	}

	.stream-url-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stream-url-title {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.8px;
		color: var(--accent-cyan);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.stream-url-code {
		font-family: monospace;
		font-size: 0.88rem;
		color: #ffffff;
		background: rgba(0, 0, 0, 0.4);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		user-select: all;
	}

	.stream-url-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.stats-pills {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.stat-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--border-glass);
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.now-playing-banner {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 16px;
		border-radius: var(--radius-md);
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--border-glass);
	}

	.banner-cover {
		width: 110px;
		height: 110px;
		border-radius: var(--radius-md);
		object-fit: cover;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
	}

	.banner-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.now-playing-label {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--accent-cyan);
		letter-spacing: 1px;
	}

	.track-title {
		font-size: 1.25rem;
		font-weight: 800;
	}

	.track-artist {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.track-actions {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}

	.icy-metadata-box {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border-radius: var(--radius-md);
		background: rgba(11, 14, 20, 0.8);
		border: 1px solid var(--border-glass);
	}

	.icy-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.icy-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.icy-badge {
		font-size: 0.7rem;
		color: var(--accent-cyan);
		background: rgba(0, 164, 220, 0.15);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.icy-code {
		font-family: monospace;
		font-size: 0.82rem;
		color: var(--accent-emerald);
		white-space: pre-wrap;
	}

	.queue-preview {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.queue-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.queue-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.03);
		font-size: 0.85rem;
	}

	.queue-idx {
		font-weight: 700;
		color: var(--accent-cyan);
		width: 24px;
	}

	.queue-name {
		font-weight: 600;
		color: var(--text-main);
		flex: 1;
	}

	.queue-artist {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.idle-studio-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		text-align: center;
		gap: 12px;
	}

	@media (max-width: 900px) {
		.studio-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
