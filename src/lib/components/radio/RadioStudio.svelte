<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { radioStationsStore } from '$lib/stores/radioStationsStore.svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { fetchBrowse } from '$lib/api/client';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import type { BroadcastMode, RadioStation } from '$lib/api/types';
	import {
		Radio,
		Play,
		Square,
		SkipForward,
		Shuffle,
		ListOrdered,
		Repeat,
		FolderTree,
		Users,
		Clock,
		Activity,
		Copy,
		Check,
		Plus,
		Pencil,
		Trash2,
		Headphones,
		AlertTriangle,
		ListMusic
	} from '@lucide/svelte';

	interface DiscoveredFolder {
		name: string;
		path: string;
	}

	const MODES: Array<{ id: BroadcastMode; label: string; icon: typeof Shuffle }> = [
		{ id: 'shuffle', label: 'Shuffle', icon: Shuffle },
		{ id: 'linear', label: 'In order', icon: ListOrdered },
		{ id: 'loop', label: 'Loop', icon: Repeat }
	];

	let discoveredFolders = $state<DiscoveredFolder[]>([]);
	let loadingFolders = $state<boolean>(false);
	let copiedUrl = $state<string | null>(null);

	/** The station being edited, or `null` when the editor is closed. */
	let editing = $state<RadioStation | null>(null);
	let creating = $state<boolean>(false);
	let draftName = $state<string>('');
	let draftGenre = $state<string>('');
	let draftMode = $state<BroadcastMode>('shuffle');
	let draftFolders = $state<string[]>([]);
	let saving = $state<boolean>(false);

	let editorOpen = $derived(creating || editing !== null);
	let liveCount = $derived(radioStationsStore.liveStations.length);

	onMount(async () => {
		await radioStationsStore.load();
		radioStationsStore.startPolling(() => radioStationsStore.load());
		discoverFolders();
	});

	onDestroy(() => radioStationsStore.stopPolling());

	/**
	 * Offer the media roots and two levels below them.
	 *
	 * Deep enough to pick "Music / Jazz" without typing a path, shallow enough
	 * not to walk a whole library to build a picker. A station takes whole
	 * subtrees anyway, so a folder here means everything under it.
	 */
	async function discoverFolders() {
		loadingFolders = true;
		const folders: DiscoveredFolder[] = [];
		for (const root of mediaStore.monitoredDirs) {
			folders.push({ name: root, path: root });
			try {
				const page = await fetchBrowse(root, 'all', 0, 100);
				for (const sub of page.folders) {
					folders.push({ name: `${basename(root)} / ${sub.name}`, path: sub.path });
					try {
						const deeper = await fetchBrowse(sub.path, 'all', 0, 50);
						for (const leaf of deeper.folders) {
							folders.push({ name: `${sub.name} / ${leaf.name}`, path: leaf.path });
						}
					} catch {
						/* a folder that cannot be listed simply is not offered */
					}
				}
			} catch {
				/* likewise for a root that has gone away */
			}
		}
		discoveredFolders = folders;
		loadingFolders = false;
	}

	function basename(path: string): string {
		const parts = path.split(/[/\\]/).filter(Boolean);
		return parts[parts.length - 1] || path;
	}

	function openCreate() {
		creating = true;
		editing = null;
		draftName = '';
		draftGenre = '';
		draftMode = 'shuffle';
		draftFolders = [];
	}

	function openEdit(station: RadioStation) {
		editing = station;
		creating = false;
		draftName = station.name;
		draftGenre = station.genre;
		draftMode = station.mode;
		draftFolders = [...station.folders];
	}

	function closeEditor() {
		creating = false;
		editing = null;
	}

	function toggleFolder(path: string) {
		draftFolders = draftFolders.includes(path)
			? draftFolders.filter((folder) => folder !== path)
			: [...draftFolders, path];
	}

	async function saveStation() {
		if (draftFolders.length === 0) return;
		saving = true;
		const draft = {
			name: draftName.trim() || 'VuIO Radio',
			genre: draftGenre.trim() || 'Variety',
			folders: draftFolders,
			mode: draftMode
		};
		const result = editing
			? await radioStationsStore.save(editing.id, draft)
			: await radioStationsStore.create(draft);
		saving = false;
		if (result) closeEditor();
	}

	async function removeStation(station: RadioStation) {
		if (!confirm(`Delete the station "${station.name}"? Anyone listening will be disconnected.`)) {
			return;
		}
		await radioStationsStore.remove(station.id);
	}

	async function copyUrl(url: string) {
		const success = await copyToClipboard(url);
		if (success) {
			copiedUrl = url;
			setTimeout(() => {
				if (copiedUrl === url) {
					copiedUrl = null;
				}
			}, 2500);
		}
	}

	function formatUptime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}

	function modeLabel(mode: BroadcastMode): string {
		return MODES.find((entry) => entry.id === mode)?.label ?? mode;
	}

	/** What the dock shows underneath the station name while monitoring. */
	function nowPlayingLabel(station: RadioStation): string | undefined {
		if (!station.now_playing) return undefined;
		const { artist, title } = station.now_playing;
		return artist ? `${artist} - ${title}` : title;
	}
</script>

<div class="studio">
	<div class="studio-header glass-card">
		<div class="header-main">
			<div class="icon-circle"><Radio size={26} class="text-cyan" /></div>
			<div>
				<h2>Radio Broadcast Studio</h2>
				<p class="subtitle">
					Run stations from folders in your library. The server does the broadcasting: a station
					keeps playing when this page is closed, and comes back on the air by itself after a
					restart until you stop it here.
				</p>
			</div>
		</div>
		<div class="header-actions">
			<div class="status-badge {liveCount > 0 ? 'live' : 'offline'}">
				<Activity size={15} />
				<span>{liveCount > 0 ? `${liveCount} ON THE AIR` : 'NOTHING ON THE AIR'}</span>
			</div>
			<button class="btn btn-primary" onclick={openCreate}>
				<Plus size={16} /> New Station
			</button>
		</div>
	</div>

	{#if radioStationsStore.error}
		<div class="error-banner glass-card">
			<AlertTriangle size={18} />
			<span>{radioStationsStore.error}</span>
		</div>
	{/if}

	{#if editorOpen}
		<div class="editor glass-card">
			<h3>{creating ? 'New station' : `Editing ${editing?.name}`}</h3>

			<div class="editor-grid">
				<div class="form-group">
					<label for="station-name">Station name</label>
					<input id="station-name" type="text" bind:value={draftName} placeholder="Kitchen Radio" />
				</div>

				<div class="form-group">
					<label for="station-genre">Genre</label>
					<input id="station-genre" type="text" bind:value={draftGenre} placeholder="Variety" />
				</div>

				<div class="form-group">
					<span class="form-label">Play order</span>
					<div class="mode-selector">
						{#each MODES as mode (mode.id)}
							<button
								class="mode-btn {draftMode === mode.id ? 'active' : ''}"
								onclick={() => (draftMode = mode.id)}
							>
								<mode.icon size={14} />
								{mode.label}
							</button>
						{/each}
					</div>
					{#if draftMode === 'linear'}
						<span class="hint">Stops when it reaches the end of the folders.</span>
					{/if}
				</div>
			</div>

			<div class="form-group">
				<div class="folder-header">
					<span class="form-label"><FolderTree size={14} /> Folders ({draftFolders.length})</span>
					{#if draftFolders.length > 0}
						<button class="link-btn" onclick={() => (draftFolders = [])}>Clear</button>
					{/if}
				</div>

				{#if loadingFolders}
					<span class="hint">Reading the library…</span>
				{:else if discoveredFolders.length === 0}
					<span class="hint">No media folders are configured yet.</span>
				{:else}
					<div class="folders">
						{#each discoveredFolders as folder (folder.path)}
							<button
								class="folder {draftFolders.includes(folder.path) ? 'selected' : ''}"
								onclick={() => toggleFolder(folder.path)}
								title={folder.path}
							>
								{#if draftFolders.includes(folder.path)}
									<Check size={14} />
								{:else}
									<FolderTree size={14} />
								{/if}
								<span class="folder-name">{folder.name}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="editor-actions">
				<button
					class="btn btn-primary"
					onclick={saveStation}
					disabled={saving || draftFolders.length === 0}
				>
					{saving ? 'Saving…' : creating ? 'Create station' : 'Save changes'}
				</button>
				<button class="btn btn-secondary" onclick={closeEditor}>Cancel</button>
				{#if draftFolders.length === 0}
					<span class="hint">Pick at least one folder.</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if radioStationsStore.stations.length === 0 && !radioStationsStore.loading}
		<div class="empty glass-card">
			<Radio size={48} class="text-cyan" />
			<h3>No stations yet</h3>
			<p>
				A station takes one or more folders and plays them as a continuous stream that anything on
				your network can tune into — another VuIO server, a hi-fi, VLC, or a browser.
			</p>
			<button class="btn btn-primary" onclick={openCreate}><Plus size={16} /> New Station</button>
		</div>
	{/if}

	<div class="stations">
		{#each radioStationsStore.stations as station (station.id)}
			<div class="station glass-card {station.is_live ? 'is-live' : ''}">
				<div class="station-head">
					<div class="station-identity">
						<span class="station-name">{station.name}</span>
						<span class="station-meta">
							{station.genre} · {modeLabel(station.mode)}
							{#if station.codec}· {station.codec.toUpperCase()}{/if}
						</span>
					</div>
					<div class="status-badge {station.is_live ? 'live' : 'offline'}">
						<Activity size={14} />
						<span>{station.is_live ? 'ON THE AIR' : 'OFF THE AIR'}</span>
					</div>
				</div>

				{#if station.is_live}
					<div class="now-playing">
						{#if station.now_playing}
							<span class="np-label">Now playing</span>
							<span class="np-title">{station.now_playing.title}</span>
							{#if station.now_playing.artist}
								<span class="np-artist">{station.now_playing.artist}</span>
							{/if}
						{:else}
							<span class="np-label">Starting…</span>
						{/if}
					</div>

					<div class="stats">
						<span class="stat"><Users size={14} /> {station.listeners} listening</span>
						<span class="stat"><Clock size={14} /> {formatUptime(station.uptime_secs)}</span>
						<span class="stat"><ListMusic size={14} /> {station.queue_len} tracks</span>
						{#if station.skipped_files > 0}
							<span
								class="stat warn"
								title="Only MP3 and AAC can be broadcast without re-encoding. Everything else in these folders is left out."
							>
								<AlertTriangle size={14} /> {station.skipped_files} skipped
							</span>
						{/if}
					</div>
				{:else}
					<p class="folders-summary">
						{station.folders.length}
						{station.folders.length === 1 ? 'folder' : 'folders'}: {station.folders.join(', ')}
					</p>
				{/if}

				{#if station.stream_url}
					<div class="stream-url {station.is_live ? '' : 'offline'}">
						<div class="url-text">
							<span class="url-label">{station.is_live ? 'Stream URL' : 'Station Stream URL'}</span>
							<code title={station.stream_url}>{station.stream_url}</code>
						</div>
						<button
							class="btn btn-secondary btn-sm copy-btn"
							onclick={() => copyUrl(station.stream_url!)}
							title="Copy stream URL to clipboard"
						>
							{#if copiedUrl === station.stream_url}
								<Check size={14} /> Copied
							{:else}
								<Copy size={14} /> Copy
							{/if}
						</button>
					</div>
				{/if}

				<div class="station-actions">
					{#if station.is_live}
						<button class="btn btn-danger btn-sm" onclick={() => radioStationsStore.stop(station.id)}>
							<Square size={14} /> Stop
						</button>
						<button class="btn btn-secondary btn-sm" onclick={() => radioStationsStore.skip(station.id)}>
							<SkipForward size={14} /> Skip
						</button>
						{#if radioStationsStore.isListeningTo(station.stream_url)}
							<button
								class="btn btn-secondary btn-sm listening"
								onclick={() => radioStationsStore.stopListening()}
							>
								<Headphones size={14} /> Stop listening
							</button>
						{:else}
							<button
								class="btn btn-secondary btn-sm"
								onclick={() => radioStationsStore.listen(station, nowPlayingLabel(station))}
								title="Monitor this station here. Broadcasting does not play anything on its own."
							>
								<Headphones size={14} /> Listen
							</button>
						{/if}
					{:else}
						<button class="btn btn-primary btn-sm" onclick={() => radioStationsStore.start(station.id)}>
							<Play size={14} /> Start broadcasting
						</button>
					{/if}
					<button class="btn btn-secondary btn-sm" onclick={() => openEdit(station)}>
						<Pencil size={14} /> Edit
					</button>
					<button class="btn btn-danger btn-sm" onclick={() => removeStation(station)}>
						<Trash2 size={14} /> Delete
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.studio {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.studio-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 22px;
		flex-wrap: wrap;
	}

	.header-main {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
		min-width: 320px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.icon-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: rgba(0, 164, 220, 0.15);
		border: 1px solid rgba(0, 164, 220, 0.3);
		flex-shrink: 0;
	}

	.studio-header h2 {
		font-size: 1.25rem;
		font-weight: 800;
		color: #ffffff;
	}

	.subtitle {
		font-size: 0.85rem;
		color: var(--text-secondary);
		max-width: 620px;
		line-height: 1.5;
		margin-top: 4px;
	}

	.status-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: var(--radius-full);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.5px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-muted);
		border: 1px solid var(--border-glass);
		white-space: nowrap;
	}

	.status-badge.live {
		background: rgba(16, 185, 129, 0.18);
		color: var(--accent-emerald);
		border-color: rgba(16, 185, 129, 0.4);
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px;
		color: var(--accent-rose);
		border: 1px solid rgba(244, 63, 94, 0.4);
		background: rgba(244, 63, 94, 0.12);
		font-size: 0.88rem;
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 22px;
	}

	.editor h3 {
		font-size: 1.05rem;
		font-weight: 700;
		border-bottom: 1px solid var(--border-glass);
		padding-bottom: 12px;
	}

	.editor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 18px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label,
	.form-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
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
		padding: 9px 10px;
		border-radius: var(--radius-md);
		font-size: 0.78rem;
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

	.folder-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--accent-cyan);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.folders {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 6px;
		max-height: 260px;
		overflow-y: auto;
		padding-right: 4px;
	}

	.folder {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-glass);
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.8rem;
		text-align: left;
	}

	.folder.selected {
		background: rgba(0, 164, 220, 0.15);
		color: var(--text-main);
		border-color: var(--accent-cyan);
	}

	.folder-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.editor-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.hint {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 56px 24px;
		text-align: center;
	}

	.empty h3 {
		font-size: 1.15rem;
		font-weight: 800;
		color: #ffffff;
	}

	.empty p {
		font-size: 0.88rem;
		color: var(--text-secondary);
		max-width: 480px;
		line-height: 1.5;
	}

	.stations {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 16px;
	}

	.station {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px;
	}

	.station.is-live {
		border-color: rgba(16, 185, 129, 0.35);
	}

	.station-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.station-identity {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.station-name {
		font-size: 1.05rem;
		font-weight: 800;
		color: #ffffff;
	}

	.station-meta {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.now-playing {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 14px;
		border-radius: var(--radius-md);
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.25);
	}

	.np-label {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: var(--accent-emerald);
	}

	.np-title {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text-main);
	}

	.np-artist {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.stat.warn {
		color: var(--accent-amber, #f59e0b);
		cursor: help;
	}

	.stream-url {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		background: rgba(0, 164, 220, 0.08);
		border: 1px solid rgba(0, 164, 220, 0.3);
	}

	.stream-url.offline {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-glass);
	}

	.stream-url.offline .url-label {
		color: var(--text-muted);
	}

	.url-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		flex: 1;
	}

	.url-label {
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: var(--accent-cyan);
	}

	.url-text code {
		font-size: 0.78rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		color: var(--text-main);
		word-break: break-all;
		overflow-wrap: anywhere;
		white-space: normal;
		line-height: 1.4;
		user-select: all;
	}

	.copy-btn {
		flex-shrink: 0;
		align-self: center;
	}

	.folders-summary {
		font-size: 0.8rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.station-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: auto;
		padding-top: 4px;
	}

	.btn-danger {
		background: rgba(244, 63, 94, 0.18);
		color: var(--accent-rose);
		border-color: rgba(244, 63, 94, 0.4);
	}

	.btn-danger:hover {
		background: rgba(244, 63, 94, 0.32);
	}

	.listening {
		color: var(--accent-emerald);
		border-color: rgba(16, 185, 129, 0.4);
	}

	@media (max-width: 640px) {
		.stations {
			grid-template-columns: 1fr;
		}
	}
</style>
