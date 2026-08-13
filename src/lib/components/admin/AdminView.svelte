<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchMetrics, fetchLogs, fetchMediaInfoStatus, runMediaInfo, cancelMediaInfo } from '../../api/client';
	import type { ServerMetrics, MediaInfoStatus } from '../../api/types';
	import MetricsPanel from './MetricsPanel.svelte';
	import ConfigEditor from './ConfigEditor.svelte';
	import ProviderCard from './ProviderCard.svelte';
	import { Activity, Terminal, Settings, Database, Play, Square, RefreshCw } from '@lucide/svelte';

	let activeSubTab = $state<'metrics' | 'logs' | 'config' | 'mediainfo'>('metrics');
	let metrics = $state<ServerMetrics | null>(null);
	let logsText = $state<string>('Loading logs...');
	let mediaInfoStatus = $state<MediaInfoStatus | null>(null);
	let logFilter = $state<string>('');

	onMount(() => {
		loadData();
		const interval = setInterval(loadData, 5000);
		return () => clearInterval(interval);
	});

	// The config tab owns its own loading and, more importantly, its own unsaved
	// edits — polling it every five seconds would overwrite them mid-keystroke.
	async function loadData() {
		if (activeSubTab === 'config') return;
		metrics = await fetchMetrics();
		if (activeSubTab === 'logs') {
			logsText = await fetchLogs();
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
		<MetricsPanel {metrics} />
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
					<h4>Providers</h4>
					<div class="provider-list">
						{#each mediaInfoStatus.providers as p (p.id)}
							<ProviderCard provider={p} onchange={loadData} />
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
		<ConfigEditor />
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
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 12px;
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
