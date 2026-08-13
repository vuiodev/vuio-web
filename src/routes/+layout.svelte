<script lang="ts">
	import '../app.css';
	import AudioDock from '$lib/components/layout/AudioDock.svelte';
	import VideoPlayerModal from '$lib/components/player/VideoPlayerModal.svelte';
	import CastModal from '$lib/components/cast/CastModal.svelte';
	import ItemDetailsModal from '$lib/components/media/ItemDetailsModal.svelte';
	import Lightbox from '$lib/components/media/Lightbox.svelte';

	let { children } = $props();
</script>

<div class="app-layout">
	{@render children()}

	<AudioDock />
	<VideoPlayerModal />
	<CastModal />
	<ItemDetailsModal />
	<Lightbox />
</div>

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-base);
		color: var(--text-main);
	}
</style>
