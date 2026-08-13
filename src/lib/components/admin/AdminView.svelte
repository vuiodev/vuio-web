<script lang="ts">
	import { onMount } from 'svelte';
	import {
		fetchMetrics,
		fetchLogs,
		fetchConfig,
		fetchMediaInfoStatus,
		runMediaInfo,
		cancelMediaInfo
	} from '../../api/client';
	import type { WebMetrics, MediaInfoStatus } from '../../api/types';
	import {
		Activity,
		Terminal,
		Settings,
		Database,
		Play,
		Square,
		RefreshCw,
		HardDrive,
		Cpu,
		Zap
	} from '@lucide/svelte';

	let activeSubTab = $state<'metrics' | 'logs' | 'config' | 'mediainfo'>('metrics');
	let metrics = $state<WebMetrics | null>(null);
	let logsText = $state<string>('Loading logs...');
	let configData = $state<any>(null);
	let mediaInfoStatus = $state<MediaInfoStatus | null>(null);
	let logFilter = $state<string>('');

	onMount(() => {
		loadData();
		const interval = setInterval(loadData, 5000);
		return () => clearInterval(interval);
	});

	async function loadData() {
		metrics = await fetchMetrics();
		if (activeSubTab === 'logs') {
			logsText = await fetchLogs();
		} else if (activeSubTab === 'config' && !configData) {
			try {
				configData = await fetchConfig();
			} catch {}
		} else if (activeSubTab === 'mediainfo') {
			mediaInfoStatus = await fetchMediaInfoStatus();
		}
	}

	async function handleRunScraper() {
		await runMediaInfo();
		loadData();
	}

	async function handleCancelScraper() {
		await cancelMediaInfo();
		loadData();
	}

	let filteredLogs = $derived(() => {
		if (!logsText) return [];
		const lines = logsText.split('\n');
		if (!logFilter) return lines;
		return lines.filter((l) => l.toLowerCase().includes(logFilter.toLowerCase()));
	});
</script>

<div class="admin-view">
	<div class="admin-header glass-card">
		<div class="admin-title">
			<Settings size={24} class="text-cyan" />
			<h2>VuIO System Administration & Metrics</h2>
		</div>

		<nav class="sub-nav">
			<button
				class="sub-tab {activeSubTab === 'metrics' ? 'active' : ''}"
				onclick={() => {
					activeSubTab = 'metrics';
					loadData();
				}}
			>
				<Activity size={16} /> Metrics
			</button>
			<button
				class="sub-tab {activeSubTab === 'mediainfo' ? 'active' : ''}"
				onclick={() => {
					activeSubTab = 'mediainfo';
					loadData();
				}}
			>
				<Database size={16} /> MediaInfo Scraper
			</button>
			<button
				class="sub-tab {activeSubTab === 'logs' ? 'active' : ''}"
				onclick={() => {
					activeSubTab = 'logs';
					loadData();
				}}
			>
				<Terminal size={16} /> Server Logs
			</button>
			<button
				class="sub-tab {activeSubTab === 'config' ? 'active' : ''}"
				onclick={() => {
					activeSubTab = 'config';
					loadData();
				}}
			>
				<Settings size={16} /> Config
			</button>
		</nav>
	</div>

	{#if activeSubTab === 'metrics'}
		<div class="metrics-grid">
			<div class="stat-card glass-card">
				<div class="stat-header">
					<Zap size={20} class="text-cyan" />
					<span class="stat-label">Browse Requests</span>
				</div>
				<span class="stat-value">{metrics ? metrics.browse_requests : '—'}</span>
				<span class="stat-sub">Cache Hits: {metrics ? metrics.cache_hits : 0}</span>
			</div>

			<div class="stat-card glass-card">
				<div class="stat-header">
					<HardDrive size={20} class="text-violet" />
					<span class="stat-label">Files Served</span>
				</div>
				<span class="stat-value">{metrics ? metrics.file_serves : '—'}</span>
				<span class="stat-sub">Direct HTTP & HLS Streams</span>
			</div>

			<div class="stat-card glass-card">
				<div class="stat-header">
					<Cpu size={20} class="text-emerald" />
					<span class="stat-label">Data Transferred</span>
				</div>
				<span class="stat-value">{metrics ? metrics.bytes_transferred_str || '0 B' : '—'}</span>
				<span class="stat-sub">Network Output</span>
			</div>

			<div class="stat-card glass-card">
				<div class="stat-header">
					<Activity size={20} class="text-amber" />
					<span class="stat-label">Avg Response Time</span>
				</div>
				<span class="stat-value">
					{metrics ? `${metrics.avg_response_time_ms.toFixed(1)} ms` : '—'}
				</span>
				<span class="stat-sub">Total Errors: {metrics ? metrics.errors : 0}</span>
			</div>
		</div>
	{:else if activeSubTab === 'mediainfo'}
		<div class="section-container glass-card">
			<div class="section-header">
				<div>
					<h3>MediaInfo Metadata Enrichment</h3>
					<p class="section-desc">
						Fetch enriched plot synopses, TMDb/TVDb titles, and cover artwork for your media files.
					</p>
				</div>
				<div class="btn-group">
					{#if mediaInfoStatus?.job.running}
						<button class="btn btn-secondary" onclick={handleCancelScraper}>
							<Square size={16} /> Stop Job
						</button>
					{:else}
						<button class="btn btn-primary" onclick={handleRunScraper}>
							<Play size={16} fill="currentColor" /> Start Scraper Run
						</button>
					{/if}
				</div>
			</div>

			{#if mediaInfoStatus}
				<div class="job-status-box glass-card">
					<h4>Current Scraper Job Status</h4>
					<div class="progress-bar-bg">
						<div
							class="progress-bar-fill"
							style="width: {mediaInfoStatus.job.total > 0
								? (mediaInfoStatus.job.processed / mediaInfoStatus.job.total) * 100
								: 0}%"
						></div>
					</div>
					<div class="job-stats-row">
						<span>Processed: {mediaInfoStatus.job.processed} / {mediaInfoStatus.job.total}</span>
						<span>Matched: {mediaInfoStatus.job.matched}</span>
						<span>Low Confidence: {mediaInfoStatus.job.low_confidence}</span>
						<span>Failed: {mediaInfoStatus.job.failed}</span>
					</div>
				</div>

				<div class="providers-section">
					<h4>Configured Providers</h4>
					<div class="provider-list">
						{#each mediaInfoStatus.providers as p (p.id)}
							<div class="provider-item glass-card">
								<div class="provider-info">
									<span class="provider-title">{p.label} ({p.group})</span>
									<span class="provider-desc">Provides: {p.provides}</span>
								</div>
								<span class="badge {p.enabled ? 'badge-emerald' : 'badge-muted'}">
									{p.enabled ? 'Enabled' : 'Disabled'}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else if activeSubTab === 'logs'}
		<div class="section-container glass-card">
			<div class="log-controls">
				<input
					type="text"
					placeholder="Filter logs (e.g. ERROR, WARN, hls)..."
					bind:value={logFilter}
					class="log-filter-input"
				/>
				<button class="btn btn-secondary btn-icon" onclick={loadData} title="Refresh Logs">
					<RefreshCw size={16} />
				</button>
			</div>

			<pre class="log-terminal">{filteredLogs().join('\n')}</pre>
		</div>
	{:else if activeSubTab === 'config'}
		<div class="section-container glass-card">
			<h3>Server Configuration</h3>
			<pre class="log-terminal">{JSON.stringify(configData, null, 2)}</pre>
		</div>
	{/if}
</div>

<style>
	.admin-view {
		display: flex;
		flex-direction: column;
		gap: 24px;
		width: 100%;
	}

	.admin-header {
		padding: 20px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}

	.admin-title {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.admin-title h2 {
		font-size: 1.25rem;
		font-weight: 800;
	}

	.sub-nav {
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.3);
		padding: 4px;
		border-radius: var(--radius-full);
	}

	.sub-tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: var(--radius-full);
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: var(--transition-smooth);
	}

	.sub-tab.active {
		color: #ffffff;
		background: var(--accent-cyan);
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
		gap: 20px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}

	.section-desc {
		font-size: 0.88rem;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.job-status-box {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.progress-bar-bg {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent-cyan), var(--accent-violet));
		transition: width 0.3s ease;
	}

	.job-stats-row {
		display: flex;
		align-items: center;
		gap: 20px;
		font-size: 0.82rem;
		color: var(--text-secondary);
		flex-wrap: wrap;
	}

	.providers-section h4 {
		font-size: 0.9rem;
		color: var(--text-muted);
		text-transform: uppercase;
		margin-bottom: 12px;
	}

	.provider-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}

	.provider-item {
		padding: 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.provider-title {
		font-size: 0.88rem;
		font-weight: 700;

		display: block;
	}

	.provider-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.log-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.log-filter-input {
		flex: 1;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.88rem;
		outline: none;
	}

	.log-terminal {
		background: #05070a;
		padding: 16px;
		border-radius: var(--radius-md);
		color: #a7f3d0;
		font-family: monospace;
		font-size: 0.82rem;
		max-height: 480px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-all;
		border: 1px solid var(--border-glass);
	}
</style>
