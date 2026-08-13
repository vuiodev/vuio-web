<script lang="ts">
	import { onMount } from 'svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { watchHistoryStore } from '$lib/stores/watchHistoryStore.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import HeroBanner from '$lib/components/media/HeroBanner.svelte';
	import MediaGrid from '$lib/components/media/MediaGrid.svelte';
	import MediaCard from '$lib/components/media/MediaCard.svelte';
	import AdminView from '$lib/components/admin/AdminView.svelte';
	import type { MediaItem } from '$lib/api/types';
	import { PlayCircle, Film, Trash2 } from '@lucide/svelte';

	let activeTab = $state<'home' | 'video' | 'audio' | 'image' | 'radio' | 'all' | 'admin'>('home');

	onMount(async () => {
		await mediaStore.initServerInfo();
		await mediaStore.load();
	});

	let startedVideos = $derived(watchHistoryStore.startedVideos);

	let featuredItem = $derived(() => {
		if (activeTab === 'home') {
			if (startedVideos.length > 0) {
				return startedVideos[0].item;
			}
			return null;
		}
		const files = mediaStore.visibleFiles;
		if (files.length === 0) return null;
		const richItem = files.find((i: MediaItem) => i.info_art || i.info_overview);
		return richItem || files[0];
	});
</script>

<Header bind:activeTab />

<main class="main-content">
	{#if activeTab === 'admin'}
		<AdminView />
	{:else if activeTab === 'home'}
		{#if featuredItem()}
			<HeroBanner item={featuredItem()!} />
		{/if}

		<div class="content-section">
			<div class="section-title-row">
				<h2>Continue Watching / Started Videos</h2>
				<div class="badge-action-group">
					<span class="count-badge">{startedVideos.length} started {startedVideos.length === 1 ? 'video' : 'videos'}</span>
					{#if startedVideos.length > 0}
						<button
							class="btn btn-secondary btn-sm"
							onclick={() => watchHistoryStore.clearAll()}
							title="Clear Watch History"
						>
							<Trash2 size={14} /> Clear History
						</button>
					{/if}
				</div>
			</div>

			{#if startedVideos.length > 0}
				<div class="media-grid">
					{#each startedVideos as entry (entry.item.id)}
						<MediaCard item={entry.item} />
					{/each}
				</div>
			{:else}
				<div class="empty-home-state glass-card">
					<PlayCircle size={56} class="text-cyan" />
					<h3>No Started Videos Yet</h3>
					<p>
						Videos you start watching will appear here automatically so you can pick up right where you left off.
					</p>
					<button class="btn btn-primary" onclick={() => (activeTab = 'video')}>
						<Film size={18} /> Browse Movies & TV Series
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<div class="content-section">
			<div class="section-title-row">
				<h2>
					{#if activeTab === 'video'}
						Movies & TV Series
					{:else if activeTab === 'audio'}
						Music Albums & Audio
					{:else if activeTab === 'image'}
						Photo Gallery
					{:else if activeTab === 'radio'}
						Live Radio Stations
					{:else}
						All Library Media
					{/if}
				</h2>
				<span class="count-badge">{mediaStore.itemCount.toLocaleString()} items</span>
			</div>

			<MediaGrid />
		</div>
	{/if}
</main>

<style>
	.main-content {
		flex: 1;
		padding: 32px;
		max-width: 1600px;
		width: 100%;
		margin: 0 auto;
		padding-bottom: 120px; /* Space for sticky audio dock */
	}

	.content-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.section-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.section-title-row h2 {
		font-size: 1.4rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.5px;
	}

	.badge-action-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.count-badge {
		font-size: 0.8rem;
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.06);
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-weight: 600;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 20px;
		width: 100%;
	}

	.empty-home-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 24px;
		gap: 16px;
		text-align: center;
		border-radius: var(--radius-lg);
	}

	.empty-home-state h3 {
		font-size: 1.25rem;
		font-weight: 800;
		color: #ffffff;
	}

	.empty-home-state p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		max-width: 460px;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.main-content {
			padding: 16px;
			padding-bottom: 110px;
		}
	}
</style>
