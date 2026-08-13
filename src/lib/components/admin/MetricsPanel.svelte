<script lang="ts">
	import type { ServerMetrics } from '$lib/api/types';
	import { Activity, HardDrive, Cpu, Zap, Database, Film, Music, Image, AlertTriangle } from '@lucide/svelte';

	let { metrics }: { metrics: ServerMetrics | null } = $props();

	// Everything here is read defensively. `runtime_diagnostics.snapshot` is null
	// on a build without the `diagnostics` feature, and the whole response is null
	// while the first poll is in flight — so nothing may be called into before it
	// is known to be there. Reading a number that was never sent is exactly what
	// used to take this screen down.
	let web = $derived(metrics?.web_handler_metrics);
	let db = $derived(metrics?.database_stats);
	let runtime = $derived(metrics?.runtime_diagnostics);
	let snapshot = $derived(runtime?.snapshot ?? null);
	let offline = $derived(runtime?.unavailable_or_incomplete_roots ?? []);

	function count(value: number | null | undefined): string {
		return typeof value === 'number' ? value.toLocaleString() : '—';
	}

	function bytes(value: number | null | undefined): string {
		if (typeof value !== 'number') return '—';
		const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
		let size = value;
		let unit = 0;
		while (size >= 1024 && unit < units.length - 1) {
			size /= 1024;
			unit += 1;
		}
		return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
	}

	function gigabytes(value: number | null | undefined): string {
		return typeof value === 'number' ? `${value.toFixed(2)} GB` : '—';
	}

	function millis(value: number | null | undefined): string {
		return typeof value === 'number' ? `${value.toFixed(1)} ms` : '—';
	}

	function percent(value: number | null | undefined): string {
		return typeof value === 'number' ? `${value.toFixed(0)}%` : '—';
	}

	function duration(seconds: number | null | undefined): string {
		if (typeof seconds !== 'number') return '—';
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	let memoryUsed = $derived(
		snapshot && typeof snapshot.system?.total_memory_bytes === 'number'
			? snapshot.system.total_memory_bytes - snapshot.system.available_memory_bytes
			: null
	);
</script>

{#if offline.length > 0}
	<!-- An unreadable library is the most consequential thing this screen knows:
	     the media is still indexed but nothing can be played from it. -->
	<div class="warning-strip glass-card">
		<AlertTriangle size={20} class="warn-icon" />
		<div class="warning-body">
			<strong>
				{offline.length}
				{offline.length === 1 ? 'library is' : 'libraries are'} unavailable
			</strong>
			<ul>
				{#each offline as root (root.path)}
					<li>
						<code>{root.path}</code>
						<span class="warn-sub">
							{root.reason} · {count(root.indexed_count)} files still indexed
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<div class="metrics-grid">
	<div class="stat-card glass-card">
		<div class="stat-header">
			<Zap size={20} class="text-cyan" />
			<span class="stat-label">Browse Requests</span>
		</div>
		<span class="stat-value">{count(web?.browse_requests)}</span>
		<span class="stat-sub">
			{count(web?.cache_hits)} cache hits · {percent(web?.cache_hit_rate_percent)} hit rate
		</span>
	</div>

	<div class="stat-card glass-card">
		<div class="stat-header">
			<HardDrive size={20} class="text-violet" />
			<span class="stat-label">Files Served</span>
		</div>
		<span class="stat-value">{count(web?.file_serves)}</span>
		<span class="stat-sub">{count(web?.directory_listings)} directory listings</span>
	</div>

	<div class="stat-card glass-card">
		<div class="stat-header">
			<Cpu size={20} class="text-emerald" />
			<span class="stat-label">Data Transferred</span>
		</div>
		<span class="stat-value">{gigabytes(web?.gigabytes_transferred)}</span>
		<span class="stat-sub">Network output</span>
	</div>

	<div class="stat-card glass-card">
		<div class="stat-header">
			<Activity size={20} class="text-amber" />
			<span class="stat-label">Avg Response Time</span>
		</div>
		<span class="stat-value">{millis(web?.average_response_time_ms)}</span>
		<span class="stat-sub">{count(web?.errors)} errors</span>
	</div>
</div>

<div class="section-container glass-card">
	<h3><Database size={18} class="text-cyan" /> Library</h3>
	<div class="detail-grid">
		<div class="detail"><Film size={16} /> <span>{count(db?.video_files)}</span> video</div>
		<div class="detail"><Music size={16} /> <span>{count(db?.audio_files)}</span> audio</div>
		<div class="detail"><Image size={16} /> <span>{count(db?.image_files)}</span> images</div>
		<div class="detail"><span>{count(db?.playlists)}</span> playlists</div>
		<div class="detail"><span>{count(db?.total_files)}</span> files total</div>
		<div class="detail"><span>{bytes(db?.total_size_bytes)}</span> on disk</div>
		<div class="detail">
			<span>{bytes(db?.database_size_bytes)}</span> index ({web?.database_backend ?? '—'})
		</div>
		<div class="detail">
			<span>{count(runtime?.accessible_directory_count)}</span> of
			{count(runtime?.monitored_directory_count)} libraries readable
		</div>
	</div>
</div>

<div class="section-container glass-card">
	<h3><Cpu size={18} class="text-violet" /> Host</h3>
	{#if snapshot}
		<div class="detail-grid">
			<div class="detail">
				<span>{percent(snapshot.system?.global_cpu_usage_percent)}</span> CPU across
				{count(snapshot.system?.cpu_count)} cores
			</div>
			<div class="detail">
				<span>{bytes(memoryUsed)}</span> of {bytes(snapshot.system?.total_memory_bytes)} memory
			</div>
			<div class="detail"><span>{duration(snapshot.system?.uptime_seconds)}</span> host uptime</div>
			<div class="detail">
				<span>{duration(snapshot.process?.runtime_seconds)}</span> server uptime
			</div>
			<div class="detail">
				<span>{bytes(snapshot.process?.memory_bytes)}</span> used by VuIO
			</div>
			<div class="detail">
				<span>{count(snapshot.process?.thread_count)}</span> threads ·
				{count(snapshot.process?.open_files)} open files
			</div>
			<div class="detail">
				<span>{bytes(snapshot.disks?.available_bytes)}</span> free across
				{count(snapshot.disks?.filesystems)} filesystems
			</div>
			<div class="detail">
				<span>{runtime?.platform ?? '—'}</span> · {runtime?.architecture ?? '—'}
			</div>
		</div>
	{:else}
		<p class="muted">
			This server was built without the diagnostics feature, so it reports no host statistics.
		</p>
		<div class="detail-grid">
			<div class="detail">
				<span>{runtime?.platform ?? '—'}</span> · {runtime?.architecture ?? '—'}
			</div>
		</div>
	{/if}
</div>

<style>
	.warning-strip {
		display: flex;
		gap: 14px;
		padding: 16px 20px;
		border-left: 3px solid var(--accent-amber, #f59e0b);
	}

	:global(.warn-icon) {
		color: var(--accent-amber, #f59e0b);
		flex-shrink: 0;
	}

	.warning-body ul {
		margin: 8px 0 0;
		padding-left: 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.warning-body code {
		font-size: 0.82rem;
		color: var(--text-main);
	}

	.warn-sub {
		display: block;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 20px;
	}

	.stat-card {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.stat-value {
		font-size: 1.8rem;
		font-weight: 800;
		color: #ffffff;
	}

	.stat-sub {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.section-container {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-container h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px 24px;
	}

	.detail {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.detail span {
		font-weight: 700;
		color: var(--text-main);
	}

	.muted {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
</style>
