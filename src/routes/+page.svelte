<script lang="ts">
	import { onMount } from 'svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import HeroBanner from '$lib/components/media/HeroBanner.svelte';
	import MediaGrid from '$lib/components/media/MediaGrid.svelte';
	import AdminView from '$lib/components/admin/AdminView.svelte';
	import type { MediaItem } from '$lib/api/types';

	let activeTab = $state<'home' | 'video' | 'audio' | 'image' | 'radio' | 'all' | 'admin'>('home');

	onMount(async () => {
		await mediaStore.initServerInfo();
		await mediaStore.loadMedia(true);
	});

	let featuredItem = $derived(() => {
		if (mediaStore.items.length === 0) return null;
		// Prefer items with artwork or synopses for the hero banner
		const richItem = mediaStore.items.find((i: MediaItem) => i.info_art || i.info_overview);
		return richItem || mediaStore.items[0];
	});
</script>

<Header bind:activeTab />

<main class="main-content">
	{#if activeTab === 'admin'}
		<AdminView />
	{:else}
		{#if activeTab === 'home' && featuredItem()}
			<HeroBanner item={featuredItem()!} />
		{/if}

		<div class="content-section">
			<div class="section-title-row">
				<h2>
					{#if activeTab === 'home'}
						Featured & Recently Added Media
					{:else if activeTab === 'video'}
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
				<span class="count-badge">{mediaStore.items.length} items</span>
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
	}

	.section-title-row h2 {
		font-size: 1.4rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.5px;
	}

	.count-badge {
		font-size: 0.8rem;
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.06);
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.main-content {
			padding: 16px;
			padding-bottom: 110px;
		}
	}
</style>
