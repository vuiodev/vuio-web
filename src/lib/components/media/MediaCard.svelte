<script lang="ts">
	import type { MediaItem } from '$lib/api/types';
	import { getCoverUrl, getMediaStreamUrl } from '$lib/api/client';
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { Play, Subtitles, Clock, Music, Film, Radio, Image as ImageIcon, Maximize2 } from '@lucide/svelte';

	let { item }: { item: MediaItem } = $props();

	let previewUrl = $derived(() => {
		if (item.cat === 'image') {
			return getMediaStreamUrl(item.id);
		}
		return getCoverUrl(item.id);
	});

	function formatDur(secs: number | null): string {
		if (!secs) return '';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}

	function handlePlay(e: MouseEvent) {
		e.stopPropagation();
		if (item.cat === 'image') {
			mediaStore.selectItem(item);
		} else if (item.cat === 'audio' || item.cat === 'radio') {
			playerStore.playAudio(item, mediaStore.items);
		} else {
			playerStore.openVideo(item);
		}
	}
</script>

<div
	class="glass-card media-card"
	role="button"
	tabindex="0"
	onclick={() => mediaStore.selectItem(item)}
	onkeydown={(e) => e.key === 'Enter' && mediaStore.selectItem(item)}
>
	<div class="thumbnail-wrapper {item.cat === 'image' ? 'photo-aspect' : ''}">
		<img
			src={previewUrl()}
			alt={item.name}
			class="cover-art"
			loading="lazy"
			onerror={(e) => {
				(e.target as HTMLImageElement).src =
					'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240" viewBox="0 0 24 24" fill="none" stroke="%2300a4dc" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
			}}
		/>

		<div class="hover-overlay">
			<button class="play-btn" onclick={handlePlay} title={item.cat === 'image' ? 'View Photo' : 'Play'}>
				{#if item.cat === 'image'}
					<Maximize2 size={22} />
				{:else}
					<Play size={24} fill="currentColor" style="margin-left: 3px;" />
				{/if}
			</button>
		</div>

		<div class="card-badges">
			{#if item.dur}
				<span class="badge-tag">
					<Clock size={11} /> {formatDur(item.dur)}
				</span>
			{/if}
			{#if item.subs}
				<span class="badge-tag cyan">
					<Subtitles size={11} /> CC
				</span>
			{/if}
		</div>
	</div>

	<div class="card-body">
		<div class="title-row">
			{#if item.cat === 'audio'}
				<Music size={14} class="cat-icon" />
			{:else if item.cat === 'video'}
				<Film size={14} class="cat-icon" />
			{:else if item.cat === 'radio'}
				<Radio size={14} class="cat-icon" />
			{:else}
				<ImageIcon size={14} class="cat-icon" />
			{/if}
			<span class="card-title" title={item.info_title || item.title || item.name}>
				{item.info_title || item.title || item.name}
			</span>
		</div>

		<div class="card-meta">
			{#if item.artist}
				<span class="meta-text">{item.artist}</span>
			{:else if item.ext}
				<span class="meta-text">{item.ext.toUpperCase()} • {item.size_str}</span>
			{:else}
				<span class="meta-text">{item.name}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.media-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		cursor: pointer;
		position: relative;
	}

	.thumbnail-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 2/3;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.4);
	}

	.thumbnail-wrapper.photo-aspect {
		aspect-ratio: 1/1;
	}

	.cover-art {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.35s ease;
	}

	.media-card:hover .cover-art {
		transform: scale(1.06);
	}

	.hover-overlay {
		position: absolute;
		inset: 0;
		background: rgba(11, 14, 20, 0.55);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.25s ease;
	}

	.media-card:hover .hover-overlay {
		opacity: 1;
	}

	.play-btn {
		width: 54px;
		height: 54px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--accent-cyan), #007bb6);
		color: #ffffff;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 164, 220, 0.6);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.play-btn:hover {
		transform: scale(1.12);
		box-shadow: 0 6px 28px rgba(0, 164, 220, 0.8);
	}

	.card-badges {
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		pointer-events: none;
	}

	.badge-tag {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 7px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.75);
		color: #ffffff;
		font-size: 0.7rem;
		font-weight: 600;
		backdrop-filter: blur(4px);
	}

	.badge-tag.cyan {
		background: rgba(0, 164, 220, 0.85);
		color: #ffffff;
	}

	.card-body {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	:global(.cat-icon) {
		color: var(--accent-cyan);
		flex-shrink: 0;
	}

	.card-title {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-main);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-meta {
		font-size: 0.78rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
