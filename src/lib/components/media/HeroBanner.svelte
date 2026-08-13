<script lang="ts">
	import type { MediaItem } from '$lib/api/types';
	import { getCoverUrl } from '$lib/api/client';
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { Play, Info, Subtitles, Clock } from '@lucide/svelte';

	let { item }: { item: MediaItem } = $props();

	function formatDur(secs: number | null): string {
		if (!secs) return '';
		const hrs = Math.floor(secs / 3600);
		const mins = Math.floor((secs % 3600) / 60);
		if (hrs > 0) return `${hrs}h ${mins}m`;
		return `${mins}m`;
	}

	function handlePlay() {
		if (item.cat === 'audio' || item.cat === 'radio') {
			playerStore.playAudio(item, mediaStore.visibleFiles);
		} else {
			playerStore.openVideo(item);
		}
	}
</script>

<div class="hero-banner">
	<div class="backdrop-wrapper">
		<img
			src={getCoverUrl(item.id)}
			alt="Backdrop"
			class="backdrop-img"
			onerror={(e) => {
				(e.target as HTMLElement).style.display = 'none';
			}}
		/>
		<div class="backdrop-overlay"></div>
	</div>

	<div class="hero-content">
		<div class="poster-box glass-card">
			<img
				src={getCoverUrl(item.id)}
				alt={item.name}
				class="poster-img"
				onerror={(e) => {
					(e.target as HTMLImageElement).src =
						'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 24 24" fill="none" stroke="%2300a4dc" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
				}}
			/>
		</div>

		<div class="hero-details">
			<div class="badge-row">
				<span class="badge badge-cyan">{item.cat.toUpperCase()}</span>
				{#if item.ext}
					<span class="badge badge-violet">{item.ext.toUpperCase()}</span>
				{/if}
				{#if item.dur}
					<span class="badge badge-muted">
						<Clock size={12} style="margin-right: 4px;" />
						{formatDur(item.dur)}
					</span>
				{/if}
				{#if item.subs}
					<span class="badge badge-emerald">
						<Subtitles size={12} style="margin-right: 4px;" /> Subtitles
					</span>
				{/if}
			</div>

			<h1 class="hero-title">{item.info_title || item.title || item.name}</h1>

			{#if item.artist}
				<h3 class="hero-subtitle">{item.artist} {#if item.album}— {item.album}{/if}</h3>
			{/if}

			{#if item.info_overview}
				<p class="hero-overview">{item.info_overview}</p>
			{:else}
				<p class="hero-overview muted">
					{item.name} — High quality streaming media available on your VuIO server.
				</p>
			{/if}

			<div class="hero-actions">
				<button class="btn btn-primary" onclick={handlePlay}>
					<Play size={18} fill="currentColor" /> Play Now
				</button>
				<button class="btn btn-secondary" onclick={() => mediaStore.selectItem(item)}>
					<Info size={18} /> Details
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.hero-banner {
		position: relative;
		width: 100%;
		min-height: 380px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		margin-bottom: 32px;
		box-shadow: var(--shadow-card);
		border: 1px solid var(--border-glass);
	}

	.backdrop-wrapper {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.backdrop-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(28px) brightness(0.4);
		transform: scale(1.1);
	}

	.backdrop-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, rgba(11, 14, 20, 0.95) 0%, rgba(11, 14, 20, 0.6) 100%);
	}

	.hero-content {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		padding: 36px 40px;
		gap: 36px;
	}

	.poster-box {
		width: 180px;
		height: 260px;
		flex-shrink: 0;
		overflow: hidden;
	}

	.poster-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-details {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 720px;
	}

	.badge-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.hero-title {
		font-size: 2.2rem;
		font-weight: 800;
		line-height: 1.2;
		color: #ffffff;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
	}

	.hero-subtitle {
		font-size: 1.1rem;
		color: var(--accent-cyan);
		font-weight: 600;
	}

	.hero-overview {
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--text-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.hero-overview.muted {
		color: var(--text-muted);
		font-style: italic;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 8px;
	}

	@media (max-width: 768px) {
		.poster-box {
			display: none;
		}
		.hero-content {
			padding: 24px;
		}
		.hero-title {
			font-size: 1.6rem;
		}
	}
</style>
