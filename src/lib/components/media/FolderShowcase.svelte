<script lang="ts">
	import type { MediaItem } from '$lib/api/types';
	import { getCoverUrl, getMediaStreamUrl } from '$lib/api/client';
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { Play, Subtitles, Clock, Tv, Music, Film, Download, CheckCircle2 } from '@lucide/svelte';

	let {
		folderName,
		files
	}: {
		folderName: string;
		files: MediaItem[];
	} = $props();

	// Find the item with the richest MediaInfo metadata to represent this folder/series
	let representativeItem = $derived(() => {
		if (files.length === 0) return null;
		const rich = files.find((f) => f.info_art || f.info_overview || f.info_title);
		return rich || files[0];
	});

	let activeEpisode = $state<MediaItem | null>(null);

	$effect(() => {
		if (files.length > 0 && !activeEpisode) {
			activeEpisode = files[0];
		}
	});

	function formatDur(secs: number | null): string {
		if (!secs) return '';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}

	function handlePlayAll() {
		const target = activeEpisode || files[0];
		if (target) {
			if (target.cat === 'audio' || target.cat === 'radio') {
				playerStore.playAudio(target, files);
			} else {
				playerStore.openVideo(target);
			}
		}
	}

	function handlePlayFile(file: MediaItem) {
		activeEpisode = file;
		if (file.cat === 'audio' || file.cat === 'radio') {
			playerStore.playAudio(file, files);
		} else {
			playerStore.openVideo(file);
		}
	}
</script>

{#if representativeItem()}
	{@const mainItem = representativeItem()!}
	<div class="showcase-container glass-card">
		<div class="showcase-backdrop">
			<img
				src={getCoverUrl(mainItem.id)}
				alt=""
				class="backdrop-blur"
				onerror={(e) => {
					(e.target as HTMLElement).style.display = 'none';
				}}
			/>
			<div class="backdrop-gradient"></div>
		</div>

		<div class="showcase-layout">
			<!-- Main Showcase Info Left/Top -->
			<div class="showcase-main">
				<div class="showcase-poster-box">
					<img
						src={getCoverUrl(mainItem.id)}
						alt={folderName}
						class="showcase-poster"
						onerror={(e) => {
							(e.target as HTMLImageElement).src =
								'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 24 24" fill="none" stroke="%2300a4dc" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
						}}
					/>
				</div>

				<div class="showcase-info">
					<div class="badge-row">
						<span class="badge badge-cyan">{mainItem.cat.toUpperCase()} SERIES</span>
						<span class="badge badge-violet">{files.length} ITEMS</span>
						{#if mainItem.subs}
							<span class="badge badge-emerald"><Subtitles size={12} /> SUBTITLES</span>
						{/if}
					</div>

					<h1 class="showcase-title">{mainItem.info_title || mainItem.album || folderName}</h1>

					{#if mainItem.artist}
						<h3 class="showcase-artist">{mainItem.artist}</h3>
					{/if}

					{#if mainItem.info_overview}
						<p class="showcase-overview">{mainItem.info_overview}</p>
					{:else}
						<p class="showcase-overview muted">
							Folder contains {files.length} media files ready for direct streaming and transcoding.
						</p>
					{/if}

					<div class="showcase-actions">
						<button class="btn btn-primary btn-lg" onclick={handlePlayAll}>
							<Play size={20} fill="currentColor" /> Play Series / All
						</button>
					</div>
				</div>
			</div>

			<!-- Episodes / Files List Column (Right or Below) -->
			<div class="episodes-panel glass-panel">
				<div class="episodes-header">
					<Tv size={18} class="text-cyan" />
					<h3>Episodes & Files ({files.length})</h3>
				</div>

				<div class="episodes-list">
					{#each files as file, idx (file.id)}
						<div
							class="episode-item {activeEpisode?.id === file.id ? 'active' : ''}"
							role="button"
							tabindex="0"
							onclick={() => (activeEpisode = file)}
							onkeydown={(e) => e.key === 'Enter' && (activeEpisode = file)}
						>
							<span class="ep-num">{idx + 1}</span>

							<div class="ep-thumb-box">
								<img
									src={getCoverUrl(file.id)}
									alt=""
									class="ep-thumb"
									onerror={(e) => {
										(e.target as HTMLImageElement).style.display = 'none';
									}}
								/>
							</div>

							<div class="ep-info">
								<span class="ep-title">{file.info_title || file.title || file.name}</span>
								<div class="ep-meta">
									{#if file.dur}
										<span><Clock size={11} /> {formatDur(file.dur)}</span>
									{/if}
									{#if file.subs}
										<span class="text-cyan"><Subtitles size={11} /> CC</span>
									{/if}
									<span>{file.size_str}</span>
								</div>
							</div>

							<button
								class="btn btn-secondary btn-icon icon-sm play-ep-btn"
								onclick={(e) => {
									e.stopPropagation();
									handlePlayFile(file);
								}}
								title="Play Episode"
							>
								<Play size={14} fill="currentColor" />
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.showcase-container {
		position: relative;
		width: 100%;
		border-radius: var(--radius-lg);
		overflow: hidden;
		margin-bottom: 24px;
		border: 1px solid var(--border-glass);
	}

	.showcase-backdrop {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.backdrop-blur {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(32px) brightness(0.35);
		transform: scale(1.1);
	}

	.backdrop-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(11, 14, 20, 0.85) 0%, rgba(11, 14, 20, 0.95) 100%);
	}

	.showcase-layout {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: 1fr 420px;
		gap: 28px;
		padding: 32px;
	}

	.showcase-main {
		display: flex;
		gap: 28px;
		align-items: flex-start;
	}

	.showcase-poster-box {
		width: 200px;
		height: 290px;
		flex-shrink: 0;
		border-radius: var(--radius-md);
		overflow: hidden;
		box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
		border: 1px solid var(--border-glass);
	}

	.showcase-poster {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.showcase-info {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.badge-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.showcase-title {
		font-size: 2.2rem;
		font-weight: 800;
		color: #ffffff;
		line-height: 1.2;
	}

	.showcase-artist {
		font-size: 1.1rem;
		color: var(--accent-cyan);
		font-weight: 600;
	}

	.showcase-overview {
		font-size: 0.92rem;
		line-height: 1.65;
		color: var(--text-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 5;
		line-clamp: 5;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.showcase-overview.muted {
		color: var(--text-muted);
		font-style: italic;
	}

	.showcase-actions {
		margin-top: 8px;
	}

	.btn-lg {
		padding: 12px 24px;
		font-size: 1rem;
	}

	.episodes-panel {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-md);
		padding: 20px;
		max-height: 480px;
		overflow: hidden;
	}

	.episodes-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-glass);
	}

	.episodes-header h3 {
		font-size: 1rem;
		font-weight: 700;
	}

	.episodes-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow-y: auto;
		padding-right: 4px;
	}

	.episode-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid transparent;
		cursor: pointer;
		transition: var(--transition-smooth);
	}

	.episode-item:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(0, 164, 220, 0.3);
	}

	.episode-item.active {
		background: rgba(0, 164, 220, 0.15);
		border-color: var(--accent-cyan);
	}

	.ep-num {
		font-size: 0.85rem;
		font-weight: 800;
		color: var(--text-muted);
		width: 20px;
		text-align: center;
	}

	.ep-thumb-box {
		width: 44px;
		height: 44px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.3);
	}

	.ep-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.ep-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.ep-title {
		font-size: 0.85rem;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ep-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.icon-sm {
		width: 32px;
		height: 32px;
	}

	@media (max-width: 1100px) {
		.showcase-layout {
			grid-template-columns: 1fr;
		}
		.showcase-main {
			flex-direction: column;
		}
		.showcase-poster-box {
			width: 160px;
			height: 230px;
		}
	}
</style>
