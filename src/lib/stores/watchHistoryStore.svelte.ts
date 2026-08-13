import type { MediaItem } from '../api/types';

export interface WatchedVideoEntry {
	item: MediaItem;
	startedAt: number;
	currentTime?: number;
}

class WatchHistoryStore {
	startedVideos = $state<WatchedVideoEntry[]>([]);

	constructor() {
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
		}
	}

	private loadFromStorage() {
		try {
			const saved = localStorage.getItem('vuio_started_videos');
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) {
					this.startedVideos = parsed;
				}
			}
		} catch {}
	}

	private saveToStorage() {
		try {
			localStorage.setItem('vuio_started_videos', JSON.stringify(this.startedVideos));
		} catch {}
	}

	recordStartedVideo(item: MediaItem, currentTime = 0) {
		if (item.cat !== 'video') return;
		const existingIndex = this.startedVideos.findIndex((v) => v.item.id === item.id);
		const entry: WatchedVideoEntry = {
			item,
			startedAt: Date.now(),
			currentTime: currentTime || (existingIndex >= 0 ? this.startedVideos[existingIndex].currentTime : 0)
		};

		if (existingIndex >= 0) {
			this.startedVideos.splice(existingIndex, 1);
		}
		this.startedVideos.unshift(entry);
		this.saveToStorage();
	}

	updateProgress(itemId: number, currentTime: number) {
		const entry = this.startedVideos.find((v) => v.item.id === itemId);
		if (entry) {
			entry.currentTime = currentTime;
			this.saveToStorage();
		}
	}

	removeStartedVideo(itemId: number) {
		this.startedVideos = this.startedVideos.filter((v) => v.item.id !== itemId);
		this.saveToStorage();
	}

	clearAll() {
		this.startedVideos = [];
		this.saveToStorage();
	}
}

export const watchHistoryStore = new WatchHistoryStore();
