<script lang="ts">
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { watchHistoryStore } from '$lib/stores/watchHistoryStore.svelte';
	import { getMediaStreamUrl, getHlsMasterUrl, getSubtitleVttUrl } from '$lib/api/client';
	import { X, Download, AlertTriangle } from '@lucide/svelte';

	const BROWSER_UNPLAYABLE_VIDEO = new Set(['avi', 'wmv', 'flv', 'mpg', 'mpeg']);

	let videoEl = $state<HTMLVideoElement | null>(null);
	let plyrInstance: any = null;
	let hlsInstance: any = null;
	let isUnsupported = $state(false);

	let item = $derived(playerStore.activeVideoItem);

	$effect(() => {
		if (item && videoEl && playerStore.isVideoOpen) {
			const ext = (item.ext || '').toLowerCase();
			if (BROWSER_UNPLAYABLE_VIDEO.has(ext)) {
				isUnsupported = true;
				return;
			}
			isUnsupported = false;
			setupPlayer();
		}

		return () => {
			cleanupPlayer();
		};
	});

	async function setupPlayer() {
		if (!item || !videoEl || typeof window === 'undefined') return;
		cleanupPlayer();

		const [PlyrModule, HlsModule] = await Promise.all([
			import('plyr'),
			import('hls.js')
		]);

		const Plyr = PlyrModule.default || PlyrModule;
		const Hls = HlsModule.default || HlsModule;

		const directUrl = getMediaStreamUrl(item.id);
		const ext = (item.ext || '').toLowerCase();
		const isHls = ext === 'mkv' || directUrl.endsWith('.m3u8');
		const playUrl = isHls ? getHlsMasterUrl(item.id) : directUrl;

		// Attach subtitle track if available
		if (item.subs) {
			const track = document.createElement('track');
			track.kind = 'subtitles';
			track.srclang = 'en';
			track.label = 'English';
			track.src = getSubtitleVttUrl(item.id);
			track.default = true;
			videoEl.appendChild(track);
		}

		// Attach HLS or direct src
		if (isHls) {
			if (Hls.isSupported()) {
				hlsInstance = new Hls({ enableWorker: true });
				hlsInstance.loadSource(playUrl);
				hlsInstance.attachMedia(videoEl);
			} else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
				videoEl.src = playUrl;
			} else {
				isUnsupported = true;
				return;
			}
		} else {
			videoEl.src = playUrl;
		}

		// Track progress in watch history
		videoEl.ontimeupdate = () => {
			if (item && videoEl && videoEl.currentTime > 2) {
				watchHistoryStore.updateProgress(item.id, Math.floor(videoEl.currentTime));
			}
		};

		// Initialize Plyr instance matching vuio crate setup
		plyrInstance = new Plyr(videoEl, {
			iconUrl: '/assets/plyr.svg',
			blankVideo: '/assets/blank.mp4',
			controls: [
				'play-large',
				'play',
				'progress',
				'current-time',
				'duration',
				'mute',
				'volume',
				'captions',
				'settings',
				'pip',
				'airplay',
				'fullscreen'
			],
			settings: ['captions', 'speed'],
			speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
			keyboard: { focused: true, global: true },
			captions: { active: Boolean(item.subs), update: true },
			seekTime: 10
		});

		const playPromise = plyrInstance.play();
		if (playPromise && typeof playPromise.catch === 'function') {
			playPromise.catch(() => {});
		}
	}

	function cleanupPlayer() {
		if (plyrInstance) {
			plyrInstance.destroy();
			plyrInstance = null;
		}
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}
	}

	function handleClose() {
		cleanupPlayer();
		playerStore.closeVideo();
	}
</script>

{#if playerStore.isVideoOpen && item}
	<div class="video-modal-backdrop">
		<div class="video-modal-content">
			<div class="video-modal-header">
				<span class="video-modal-title">{item.info_title || item.title || item.name}</span>
				<button class="btn btn-secondary btn-icon icon-sm" onclick={handleClose}>
					<X size={18} />
				</button>
			</div>

			<div class="video-stage">
				{#if isUnsupported}
					<div class="unsupported-panel glass-card">
						<AlertTriangle size={48} class="text-amber" />
						<h3>Container Format Unsupported for In-Browser Playback</h3>
						<p>
							File format <strong>.{item.ext.toUpperCase()}</strong> cannot be demuxed directly inside
							your web browser. You can download the raw media file below.
						</p>
						<a href={getMediaStreamUrl(item.id)} download={item.name} class="btn btn-primary">
							<Download size={18} /> Download {item.name}
						</a>
					</div>
				{:else}
					<video bind:this={videoEl} playsinline controls preload="metadata" class="plyr-video-el"></video>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.video-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 300;
		background: #000000;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.video-modal-content {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.video-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 24px;
		background: rgba(20, 25, 35, 0.95);
		border-bottom: 1px solid var(--border-glass);
		z-index: 10;
	}

	.video-modal-title {
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
	}

	.icon-sm {
		width: 32px;
		height: 32px;
	}

	.video-stage {
		position: relative;
		flex: 1;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000000;
	}

	.plyr-video-el {
		width: 100%;
		height: 100%;
		max-height: calc(100vh - 60px);
	}

	.unsupported-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 40px;
		max-width: 500px;
		text-align: center;
	}

	:global(.text-amber) {
		color: var(--accent-amber);
	}
</style>
