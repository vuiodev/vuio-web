<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { radioStationsStore } from '$lib/stores/radioStationsStore.svelte';
	import {
		Radio,
		Users,
		Clock,
		Headphones,
		Square,
		Server,
		RefreshCw,
		Copy,
		Check,
		AlertTriangle
	} from '@lucide/svelte';

	import { copyToClipboard } from '$lib/utils/clipboard';

	let copiedUrl = $state<string | null>(null);

	let totalStations = $derived(
		radioStationsStore.peers.reduce((count, peer) => count + peer.stations.length, 0)
	);

	onMount(async () => {
		await radioStationsStore.discover();
		radioStationsStore.startPolling(() => radioStationsStore.discover(true), 6000);
	});

	onDestroy(() => radioStationsStore.stopPolling());

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
		if (h > 0) return `${h}h ${m}m`;
		if (m > 0) return `${m}m`;
		return `${seconds}s`;
	}
</script>

<div class="local">
	<div class="local-header glass-card">
		<div class="header-main">
			<div class="icon-circle"><Server size={24} class="text-cyan" /></div>
			<div>
				<h2>Local Radio Stations</h2>
				<p class="subtitle">
					Everything being broadcast right now by VuIO servers on this network — this one and any
					others it can find. Servers announce themselves over mDNS, so a station appears here
					within a few seconds of going on the air.
				</p>
			</div>
		</div>
		<div class="header-actions">
			<span class="count-badge">
				{totalStations}
				{totalStations === 1 ? 'station' : 'stations'} on {radioStationsStore.peers.length}
				{radioStationsStore.peers.length === 1 ? 'server' : 'servers'}
			</span>
			<button
				class="btn btn-secondary btn-sm"
				onclick={() => radioStationsStore.discover()}
				disabled={radioStationsStore.discovering}
			>
				<RefreshCw size={14} />
				{radioStationsStore.discovering ? 'Looking…' : 'Refresh'}
			</button>
		</div>
	</div>

	{#if radioStationsStore.error}
		<div class="error-banner glass-card">
			<AlertTriangle size={18} />
			<span>{radioStationsStore.error}</span>
		</div>
	{/if}

	{#if radioStationsStore.peers.length === 0}
		<div class="empty glass-card">
			{#if radioStationsStore.discovering}
				<RefreshCw size={44} class="text-cyan spin" />
				<h3>Looking for stations…</h3>
			{:else}
				<Radio size={48} class="text-cyan" />
				<h3>Nothing on the air</h3>
				<p>
					No VuIO server on this network is broadcasting. Start one in the Radio Broadcast Studio
					and it will appear here — on this machine and on every other VuIO server too.
				</p>
			{/if}
		</div>
	{/if}

	{#each radioStationsStore.peers as peer (peer.uuid)}
		<div class="server-group">
			<div class="server-head">
				<Server size={16} />
				<span class="server-name">{peer.name}</span>
				{#if peer.is_self}
					<span class="tag">This server</span>
				{:else}
					<span class="server-address">{peer.address}</span>
				{/if}
			</div>

			<div class="stations">
				{#each peer.stations as station (station.stream_url)}
					<div class="station glass-card">
						<div class="station-head">
							<div class="identity">
								<span class="name">{station.name}</span>
								<span class="meta">{station.genre} · {station.codec.toUpperCase()}</span>
							</div>
							<span class="live-badge"><Radio size={12} /> LIVE</span>
						</div>

						{#if station.now_playing}
							<div class="now-playing">
								<span class="np-label">Now playing</span>
								<span class="np-title">{station.now_playing}</span>
							</div>
						{/if}

						<div class="stats">
							<span class="stat"><Users size={14} /> {station.listeners} listening</span>
							<span class="stat"><Clock size={14} /> {formatUptime(station.uptime_secs)}</span>
						</div>

						<div class="actions">
							{#if radioStationsStore.isListeningTo(station.stream_url)}
								<button
									class="btn btn-secondary btn-sm listening"
									onclick={() => radioStationsStore.stopListening()}
								>
									<Square size={14} /> Stop
								</button>
							{:else}
								<button
									class="btn btn-primary btn-sm"
									onclick={() => radioStationsStore.listen(station, station.now_playing)}
								>
									<Headphones size={14} /> Listen
								</button>
							{/if}
							<button class="btn btn-secondary btn-sm" onclick={() => copyUrl(station.stream_url)}>
								{#if copiedUrl === station.stream_url}
									<Check size={14} /> Copied
								{:else}
									<Copy size={14} /> Copy URL
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.local {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.local-header {
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

	.local-header h2 {
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

	.count-badge {
		font-size: 0.78rem;
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.06);
		padding: 5px 12px;
		border-radius: var(--radius-full);
		font-weight: 600;
		white-space: nowrap;
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

	.server-group {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.server-head {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.server-name {
		font-weight: 700;
		color: var(--text-main);
	}

	.server-address {
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.tag {
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: var(--radius-full);
		background: rgba(0, 164, 220, 0.15);
		color: var(--accent-cyan);
		border: 1px solid rgba(0, 164, 220, 0.3);
	}

	.stations {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 16px;
	}

	.station {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px;
		border-color: rgba(16, 185, 129, 0.25);
	}

	.station-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.identity {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.name {
		font-size: 1rem;
		font-weight: 800;
		color: #ffffff;
	}

	.meta {
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.live-badge {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.5px;
		background: rgba(16, 185, 129, 0.18);
		color: var(--accent-emerald);
		border: 1px solid rgba(16, 185, 129, 0.4);
		white-space: nowrap;
	}

	.now-playing {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-glass);
	}

	.np-label {
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.np-title {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-main);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	.actions {
		display: flex;
		gap: 8px;
		margin-top: auto;
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
