<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { castStore } from '$lib/stores/castStore.svelte';
	import { getCoverUrl, getMediaStreamUrl } from '$lib/api/client';
	import { Play, Tv, Cast, Download, X, Subtitles, Clock, HardDrive, FileCode } from '@lucide/svelte';

	let item = $derived(mediaStore.selectedItem);

	function formatDur(secs: number | null): string {
		if (!secs) return 'Unknown';
		const hrs = Math.floor(secs / 3600);
		const mins = Math.floor((secs % 3600) / 60);
		if (hrs > 0) return `${hrs}h ${mins}m`;
		return `${mins}m`;
	}

	function handleClose() {
		mediaStore.selectItem(null);
	}

	function handleDirectPlay() {
		if (!item) return;
		handleClose();
		if (item.cat === 'audio' || item.cat === 'radio') {
			playerStore.playAudio(item, mediaStore.visibleFiles);
		} else {
			playerStore.openVideo(item);
		}
	}

	function handleCast() {
		if (!item) return;
		handleClose();
		castStore.openCastModal(item);
	}
</script>

{#if item}
	<div class="modal-backdrop" role="dialog" aria-modal="true">
		<div class="modal-card glass-panel">
			<button class="close-btn btn btn-secondary btn-icon" onclick={handleClose}>
				<X size={18} />
			</button>

			<div class="modal-hero">
				<img
					src={getCoverUrl(item.id)}
					alt=""
					class="hero-bg"
					onerror={(e) => {
						(e.target as HTMLElement).style.display = 'none';
					}}
				/>
				<div class="hero-mask"></div>

				<div class="modal-header-content">
					<img
						src={getCoverUrl(item.id)}
						alt={item.name}
						class="detail-poster"
						onerror={(e) => {
							(e.target as HTMLImageElement).src =
								'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240" viewBox="0 0 24 24" fill="none" stroke="%2300a4dc" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
						}}
					/>
					<div class="detail-header-info">
						<div class="tag-group">
							<span class="badge badge-cyan">{item.cat.toUpperCase()}</span>
							<span class="badge badge-violet">{item.ext.toUpperCase()}</span>
							{#if item.subs}
								<span class="badge badge-emerald"><Subtitles size={12} /> Subtitles Available</span>
							{/if}
						</div>
						<h2 class="detail-title">{item.info_title || item.title || item.name}</h2>
						{#if item.artist}
							<p class="detail-artist">{item.artist} {#if item.album}— {item.album}{/if}</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="modal-body">
				{#if item.info_overview}
					<div class="section-box">
						<h3>Overview / Synopsis</h3>
						<p class="synopsis">{item.info_overview}</p>
					</div>
				{/if}

				<div class="section-box">
					<h3>Media Specifications</h3>
					<div class="meta-grid">
						<div class="meta-item">
							<Clock size={16} class="meta-icon" />
							<div>
								<span class="meta-label">Duration</span>
								<span class="meta-val">{formatDur(item.dur)}</span>
							</div>
						</div>
						<div class="meta-item">
							<HardDrive size={16} class="meta-icon" />
							<div>
								<span class="meta-label">File Size</span>
								<span class="meta-val">{item.size_str}</span>
							</div>
						</div>
						<div class="meta-item">
							<FileCode size={16} class="meta-icon" />
							<div>
								<span class="meta-label">MIME Type</span>
								<span class="meta-val">{item.mime}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="action-bar">
					<button class="btn btn-primary" onclick={handleDirectPlay}>
						<Play size={18} fill="currentColor" /> Direct Play
					</button>

					{#if item.cat === 'video'}
						<button class="btn btn-secondary" onclick={handleDirectPlay}>
							<Tv size={18} /> Stream HLS Transcode
						</button>
					{/if}

					<button class="btn btn-secondary" onclick={handleCast}>
						<Cast size={18} /> Cast to TV / DLNA
					</button>

					<a
						href={getMediaStreamUrl(item.id)}
						download={item.name}
						class="btn btn-secondary"
					>
						<Download size={18} /> Download
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.modal-card {
		position: relative;
		width: 100%;
		max-width: 720px;
		max-height: 90vh;
		overflow-y: auto;
		border-radius: var(--radius-lg);
		padding: 0;
	}

	.close-btn {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 10;
		width: 36px;
		height: 36px;
	}

	.modal-hero {
		position: relative;
		height: 220px;
		overflow: hidden;
		display: flex;
		align-items: flex-end;
		padding: 24px;
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(20px) brightness(0.4);
		transform: scale(1.1);
	}

	.hero-mask {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 0%, var(--bg-surface) 100%);
	}

	.modal-header-content {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: flex-end;
		gap: 20px;
	}

	.detail-poster {
		width: 110px;
		height: 160px;
		object-fit: cover;
		border-radius: var(--radius-md);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
	}

	.detail-header-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tag-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.detail-title {
		font-size: 1.6rem;
		font-weight: 800;
		color: #ffffff;
		line-height: 1.2;
	}

	.detail-artist {
		font-size: 0.95rem;
		color: var(--accent-cyan);
		font-weight: 600;
	}

	.modal-body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.section-box h3 {
		font-size: 0.95rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 8px;
	}

	.synopsis {
		font-size: 0.92rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 16px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255, 255, 255, 0.04);
		padding: 10px 14px;
		border-radius: var(--radius-sm);
	}

	:global(.meta-icon) {
		color: var(--accent-cyan);
	}

	.meta-label {
		display: block;
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.meta-val {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.action-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-top: 8px;
	}
</style>
