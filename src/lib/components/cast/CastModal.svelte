<script lang="ts">
	import { castStore } from '$lib/stores/castStore.svelte';
	import { Cast, X, Play, Pause, Square, Tv, Radio, Loader2 } from '@lucide/svelte';

	let isLoading = $state(false);

	async function handleSelectRenderer(renderer: any) {
		if (!castStore.targetMedia) return;
		isLoading = true;
		await castStore.startCast(renderer, castStore.targetMedia);
		isLoading = false;
	}
</script>

{#if castStore.isCastModalOpen}
	<div class="modal-backdrop" role="dialog" aria-modal="true">
		<div class="modal-card glass-panel">
			<div class="modal-header">
				<div class="header-title">
					<Cast size={22} class="text-cyan" />
					<h3>Cast to Local Network Device</h3>
				</div>
				<button class="btn btn-secondary btn-icon icon-sm" onclick={() => castStore.closeCastModal()}>
					<X size={18} />
				</button>
			</div>

			<div class="modal-body">
				{#if castStore.targetMedia}
					<div class="target-card glass-card">
						<span class="target-label">Selected Media</span>
						<span class="target-title">
							{castStore.targetMedia.info_title || castStore.targetMedia.title || castStore.targetMedia.name}
						</span>
					</div>
				{/if}

				<div class="renderer-section">
					<h4>Available Network Renderers</h4>
					{#if castStore.renderers.length === 0}
						<div class="empty-renderers">
							<Radio size={32} class="text-muted" />
							<p>Searching for DLNA, UPnP, or Chromecast devices on your network...</p>
							<button class="btn btn-secondary" onclick={() => castStore.loadRenderers()}>
								Refresh Device List
							</button>
						</div>
					{:else}
						<div class="renderer-list">
							{#each castStore.renderers as r (r.id)}
								<button
									type="button"
									class="renderer-item glass-card"
									onclick={() => handleSelectRenderer(r)}
								>
									<Tv size={24} class="text-cyan" />
									<div class="renderer-info">
										<span class="renderer-name">{r.name}</span>
										<span class="renderer-type">{r.device_type} • {r.ip}</span>
									</div>
									<span class="btn btn-primary btn-sm">
										{#if isLoading}
											<Loader2 size={14} class="spinner" />
										{:else}
											Cast Now
										{/if}
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				{#if castStore.isCasting && castStore.activeRenderer}
					<div class="active-cast-panel glass-card">
						<h4>Active Casting Session</h4>
						<p>Casting to <strong>{castStore.activeRenderer.name}</strong></p>

						<div class="remote-controls">
							<button class="btn btn-secondary btn-icon" onclick={() => castStore.control('play')}>
								<Play size={18} />
							</button>
							<button class="btn btn-secondary btn-icon" onclick={() => castStore.control('pause')}>
								<Pause size={18} />
							</button>
							<button class="btn btn-secondary btn-icon" onclick={() => castStore.control('stop')}>
								<Square size={18} />
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 250;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.modal-card {
		width: 100%;
		max-width: 520px;
		border-radius: var(--radius-lg);
		padding: 24px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.header-title h3 {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.target-card {
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.target-label {
		font-size: 0.72rem;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.target-title {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--accent-cyan);
	}

	.renderer-section h4 {
		font-size: 0.85rem;
		color: var(--text-muted);
		text-transform: uppercase;
		margin-bottom: 12px;
	}

	.empty-renderers {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 30px 16px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.88rem;
	}

	.renderer-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.renderer-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px;
		cursor: pointer;
		width: 100%;
		text-align: left;
		background: var(--bg-glass-card);
		border: 1px solid var(--border-glass);
		color: inherit;
	}

	.renderer-info {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.renderer-name {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.renderer-type {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.active-cast-panel {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
	}

	.remote-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.icon-sm {
		width: 32px;
		height: 32px;
	}
</style>
