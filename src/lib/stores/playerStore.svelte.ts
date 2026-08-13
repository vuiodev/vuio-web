import type { MediaItem } from '../api/types';
import { watchHistoryStore } from './watchHistoryStore.svelte';

class PlayerStore {
	// Video state
	activeVideoItem = $state<MediaItem | null>(null);
	isVideoOpen = $state<boolean>(false);

	// Audio state
	activeAudioItem = $state<MediaItem | null>(null);
	isPlayingAudio = $state<boolean>(false);
	audioQueue = $state<MediaItem[]>([]);
	audioIndex = $state<number>(-1);
	audioProgress = $state<number>(0);
	audioDuration = $state<number>(0);
	volume = $state<number>(1);
	isMuted = $state<boolean>(false);
	isQueueOpen = $state<boolean>(false);

	openVideo(item: MediaItem) {
		this.activeVideoItem = item;
		this.isVideoOpen = true;
		watchHistoryStore.recordStartedVideo(item);
	}

	closeVideo() {
		this.isVideoOpen = false;
		this.activeVideoItem = null;
	}

	playAudio(item: MediaItem, queue: MediaItem[] = []) {
		this.activeAudioItem = item;
		this.isPlayingAudio = true;
		if (queue.length > 0) {
			this.audioQueue = queue;
			this.audioIndex = queue.findIndex((i) => i.id === item.id);
		} else {
			this.audioQueue = [item];
			this.audioIndex = 0;
		}
	}

	toggleAudioPlay() {
		this.isPlayingAudio = !this.isPlayingAudio;
	}

	nextAudio() {
		if (this.audioQueue.length > 0 && this.audioIndex < this.audioQueue.length - 1) {
			this.audioIndex += 1;
			this.activeAudioItem = this.audioQueue[this.audioIndex];
			this.isPlayingAudio = true;
		}
	}

	prevAudio() {
		if (this.audioQueue.length > 0 && this.audioIndex > 0) {
			this.audioIndex -= 1;
			this.activeAudioItem = this.audioQueue[this.audioIndex];
			this.isPlayingAudio = true;
		}
	}

	toggleQueue() {
		this.isQueueOpen = !this.isQueueOpen;
	}
}

export const playerStore = new PlayerStore();
