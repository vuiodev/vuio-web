<script lang="ts">
	import { playerStore } from '$lib/stores/playerStore.svelte';
	import { getMediaStreamUrl, getCoverUrl } from '$lib/api/client';
	import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic } from '@lucide/svelte';

	let audioEl: HTMLAudioElement;

	$effect(() => {
		if (playerStore.activeAudioItem && audioEl) {
			const streamUrl = getMediaStreamUrl(playerStore.activeAudioItem.id);
			if (audioEl.src !== window.location.origin + streamUrl) {
				audioEl.src = streamUrl;
				if (playerStore.isPlayingAudio) {
					audioEl.play().catch(() => {});
				}
			}
		}
	});

	$effect(() => {
		if (audioEl) {
			if (playerStore.isPlayingAudio && audioEl.paused) {
				audioEl.play().catch(() => {});
			} else if (!playerStore.isPlayingAudio && !audioEl.paused) {
				audioEl.pause();
			}
		}
	});

	function handleTimeUpdate() {
		if (audioEl) {
			playerStore.audioProgress = audioEl.currentTime;
			playerStore.audioDuration = audioEl.duration || 0;
		}
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value);
		if (audioEl) {
			audioEl.currentTime = val;
			playerStore.audioProgress = val;
		}
	}

	function handleVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value);
		playerStore.volume = val;
		if (audioEl) {
			audioEl.volume = val;
			audioEl.muted = val === 0;
		}
	}

	function toggleMute() {
		playerStore.isMuted = !playerStore.isMuted;
		if (audioEl) {
			audioEl.muted = playerStore.isMuted;
		}
	}

	function formatTime(secs: number): string {
		if (!secs || isNaN(secs)) return '0:00';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}
</script>

<audio
	bind:this={audioEl}
	ontimeupdate={handleTimeUpdate}
	onended={() => playerStore.nextAudio()}
></audio>

{#if playerStore.activeAudioItem}
	<div class="glass-panel audio-dock">
		<div class="track-info">
			<img
				src={getCoverUrl(playerStore.activeAudioItem.id)}
				alt="Cover"
				class="album-art"
				onerror={(e) => {
					(e.target as HTMLImageElement).src =
						'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
				}}
			/>
			<div class="track-details">
				<span class="track-title">{playerStore.activeAudioItem.title || playerStore.activeAudioItem.name}</span>
				<span class="track-artist">
					{playerStore.activeAudioItem.artist || 'Unknown Artist'}
					{#if playerStore.activeAudioItem.album}
						— {playerStore.activeAudioItem.album}
					{/if}
				</span>
			</div>
		</div>

		<div class="player-center">
			<div class="control-buttons">
				<button class="btn btn-secondary btn-icon icon-sm" onclick={() => playerStore.prevAudio()}>
					<SkipBack size={16} />
				</button>
				<button
					class="btn btn-primary btn-icon icon-lg"
					onclick={() => playerStore.toggleAudioPlay()}
				>
					{#if playerStore.isPlayingAudio}
						<Pause size={20} />
					{:else}
						<Play size={20} />
					{/if}
				</button>
				<button class="btn btn-secondary btn-icon icon-sm" onclick={() => playerStore.nextAudio()}>
					<SkipForward size={16} />
				</button>
			</div>

			<div class="progress-container">
				<span class="time-text">{formatTime(playerStore.audioProgress)}</span>
				<input
					type="range"
					min="0"
					max={playerStore.audioDuration || 100}
					value={playerStore.audioProgress}
					oninput={handleSeek}
					class="scrubber"
				/>
				<span class="time-text">{formatTime(playerStore.audioDuration)}</span>
			</div>
		</div>

		<div class="player-right">
			<button class="btn btn-secondary btn-icon icon-sm" onclick={toggleMute}>
				{#if playerStore.isMuted || playerStore.volume === 0}
					<VolumeX size={16} />
				{:else}
					<Volume2 size={16} />
				{/if}
			</button>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={playerStore.volume}
				oninput={handleVolume}
				class="volume-slider"
			/>
			<button
				class="btn btn-secondary btn-icon icon-sm {playerStore.isQueueOpen ? 'active' : ''}"
				onclick={() => playerStore.toggleQueue()}
				title="Queue"
			>
				<ListMusic size={16} />
			</button>
		</div>
	</div>
{/if}

<style>
	.audio-dock {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 80px;
		z-index: 150;
		display: grid;
		grid-template-columns: 280px 1fr 240px;
		align-items: center;
		padding: 0 24px;
		gap: 20px;
		border-top: 1px solid var(--border-glass);
		box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.5);
	}

	.track-info {
		display: flex;
		align-items: center;
		gap: 14px;
		overflow: hidden;
	}

	.album-art {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background: rgba(255, 255, 255, 0.05);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	.track-details {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.track-title {
		font-size: 0.9rem;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-artist {
		font-size: 0.78rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.player-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.control-buttons {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.icon-sm {
		width: 32px;
		height: 32px;
	}

	.icon-lg {
		width: 40px;
		height: 40px;
	}

	.progress-container {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		max-width: 540px;
	}

	.time-text {
		font-size: 0.75rem;
		color: var(--text-muted);
		width: 36px;
		text-align: center;
	}

	.scrubber, .volume-slider {
		flex: 1;
		height: 4px;
		border-radius: var(--radius-full);
		accent-color: var(--accent-cyan);
		cursor: pointer;
	}

	.player-right {
		display: flex;
		align-items: center;
		gap: 10px;
		justify-content: flex-end;
	}

	.volume-slider {
		width: 80px;
	}
</style>
