import type { MediaItem } from '../api/types';
import { fetchMediaPage } from '../api/client';
import { playerStore } from './playerStore.svelte';

export type PlaybackMode = 'linear' | 'shuffle' | 'loop';

class RadioBroadcastStore {
	stationName = $state<string>('VuIO Live FM Broadcast');
	stationGenre = $state<string>('Variety / Live Radio');
	selectedFolders = $state<string[]>([]);
	playbackMode = $state<PlaybackMode>('shuffle');

	isBroadcasting = $state<boolean>(false);
	currentTrack = $state<MediaItem | null>(null);
	currentTrackIndex = $state<number>(-1);
	playlistQueue = $state<MediaItem[]>([]);

	// ICY Metadata Stream attributes
	icyMetadata = $state<string>('');
	icyMetaInt = 16000;
	listenersCount = $state<number>(0);
	elapsedBroadcastSecs = $state<number>(0);

	private timerId: ReturnType<typeof setInterval> | null = null;
	private pollTimerId: ReturnType<typeof setInterval> | null = null;

	async initFromBackend() {
		try {
			const res = await fetch('/api/radio/broadcast/status');
			if (res.ok) {
				const status = await res.json();
				this.stationName = status.station_name || this.stationName;
				this.stationGenre = status.station_genre || this.stationGenre;
				this.playbackMode = status.mode || this.playbackMode;
				this.selectedFolders = status.selected_folders || [];
				this.listenersCount = status.listeners_count || 0;
				this.elapsedBroadcastSecs = status.elapsed_secs || 0;

				if (status.is_broadcasting) {
					this.isBroadcasting = true;
					this.icyMetadata = status.icy_metadata || '';

					if (status.current_title || status.current_path) {
						this.currentTrack = {
							id: 0,
							path: status.current_path || '',
							name: status.current_title || 'Live Radio Track',
							title: status.current_title || 'Live Radio Track',
							info_title: status.current_title || null,
							artist: status.current_artist || 'Live Radio',
							album: null,
							size_str: '',
							cat: 'audio',
							mime: 'audio/mpeg',
							subs: false,
							dur: null,
							info_overview: null,
							info_art: false,
							ext: 'mp3'
						};
					}

					if (this.timerId) clearInterval(this.timerId);
					this.timerId = setInterval(() => {
						if (this.isBroadcasting) {
							this.elapsedBroadcastSecs += 1;
						}
					}, 1000);

					if (this.pollTimerId) clearInterval(this.pollTimerId);
					this.pollTimerId = setInterval(() => {
						if (this.isBroadcasting) {
							this.fetchStatusFromBackend();
						}
					}, 3000);
				} else {
					this.isBroadcasting = false;
				}
			}
		} catch (e) {
			console.warn('Failed to load initial broadcast state from backend:', e);
		}
	}

	setStationName(name: string) {
		this.stationName = name;
		this.syncBackendState();
	}

	setStationGenre(genre: string) {
		this.stationGenre = genre;
		this.syncBackendState();
	}

	setPlaybackMode(mode: PlaybackMode) {
		this.playbackMode = mode;
		if (this.isBroadcasting && this.playlistQueue.length > 0) {
			this.rebuildQueue(this.playlistQueue);
		}
		this.syncBackendState();
	}

	toggleFolderSelection(folderPath: string) {
		if (this.selectedFolders.includes(folderPath)) {
			this.selectedFolders = this.selectedFolders.filter((f) => f !== folderPath);
		} else {
			this.selectedFolders = [...this.selectedFolders, folderPath];
		}
		this.syncBackendState();
	}

	async startBroadcast(allFiles: MediaItem[] = []) {
		let pool: MediaItem[] = [];

		try {
			const page = await fetchMediaPage('audio', '', null, 500);
			pool = page.files;
		} catch {
			pool = [];
		}

		if (pool.length === 0 && allFiles.length > 0) {
			pool = allFiles.filter(
				(item) =>
					item.cat === 'audio' ||
					item.mime?.startsWith('audio/') ||
					['mp3', 'flac', 'wav', 'aac', 'm4a', 'opus', 'ogg'].includes(item.ext?.toLowerCase())
			);
		}

		if (pool.length === 0) {
			try {
				const page = await fetchMediaPage('all', '', null, 500);
				pool = page.files.filter(
					(item) =>
						item.cat === 'audio' ||
						item.mime?.startsWith('audio/') ||
						['mp3', 'flac', 'wav', 'aac', 'm4a', 'opus', 'ogg'].includes(item.ext?.toLowerCase())
				);
			} catch {
				pool = [];
			}
		}

		if (this.selectedFolders.length > 0 && pool.length > 0) {
			const filtered = pool.filter((item) =>
				this.selectedFolders.some((dir) => isSubPath(item.path, dir))
			);
			if (filtered.length > 0) {
				pool = filtered;
			}
		}

		if (pool.length === 0) {
			console.warn('No audio tracks found to broadcast');
			return;
		}

		this.rebuildQueue(pool);
		this.isBroadcasting = true;
		this.listenersCount = 0;
		await this.syncBackendState('start');
		this.playTrackAtIndex(0);

		if (this.timerId) clearInterval(this.timerId);
		this.timerId = setInterval(() => {
			if (this.isBroadcasting) {
				this.elapsedBroadcastSecs += 1;
			}
		}, 1000);

		// Poll backend status for real-time listener telemetry
		if (this.pollTimerId) clearInterval(this.pollTimerId);
		this.pollTimerId = setInterval(() => {
			if (this.isBroadcasting) {
				this.fetchStatusFromBackend();
			}
		}, 3000);
	}

	stopBroadcast() {
		this.isBroadcasting = false;
		this.currentTrack = null;
		this.currentTrackIndex = -1;
		this.icyMetadata = '';
		this.listenersCount = 0;

		if (this.timerId) {
			clearInterval(this.timerId);
			this.timerId = null;
		}
		if (this.pollTimerId) {
			clearInterval(this.pollTimerId);
			this.pollTimerId = null;
		}
		this.syncBackendState('stop');
	}

	private rebuildQueue(files: MediaItem[]) {
		let queue = [...files];
		if (this.playbackMode === 'shuffle') {
			queue = shuffleArray(queue);
		} else {
			queue.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
		}
		this.playlistQueue = queue;
	}

	playTrackAtIndex(index: number) {
		if (this.playlistQueue.length === 0) return;
		let idx = index;
		if (idx >= this.playlistQueue.length) {
			if (this.playbackMode === 'loop') {
				idx = 0;
			} else if (this.playbackMode === 'shuffle') {
				this.playlistQueue = shuffleArray([...this.playlistQueue]);
				idx = 0;
			} else {
				this.stopBroadcast();
				return;
			}
		}

		this.currentTrackIndex = idx;
		const track = this.playlistQueue[idx];
		this.currentTrack = track;

		const artist = track.artist || 'Unknown Artist';
		const title = track.info_title || track.title || track.name;
		this.icyMetadata = `StreamTitle='${artist} - ${title}';StreamUrl='';`;

		this.syncBackendState('set_track', track);

		const radioItem: MediaItem = {
			...track,
			cat: 'radio',
			mime: 'audio/radio',
			title: `${this.stationName} • ${title}`,
			artist: `ICY Live: ${artist}`
		};
		playerStore.playAudio(radioItem, [radioItem]);
	}

	nextTrack() {
		if (!this.isBroadcasting) return;
		this.playTrackAtIndex(this.currentTrackIndex + 1);
	}

	prevTrack() {
		if (!this.isBroadcasting) return;
		const prevIdx = Math.max(0, this.currentTrackIndex - 1);
		this.playTrackAtIndex(prevIdx);
	}

	private async syncBackendState(action = 'update', track: MediaItem | null = null) {
		try {
			const activeTrack = track || this.currentTrack;
			const res = await fetch('/api/radio/broadcast/control', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					station_name: this.stationName,
					station_genre: this.stationGenre,
					mode: this.playbackMode,
					folders: this.selectedFolders,
					track_id: activeTrack ? activeTrack.id : null,
					track_path: activeTrack ? activeTrack.path : null,
					title: activeTrack ? activeTrack.info_title || activeTrack.title || activeTrack.name : null,
					artist: activeTrack ? activeTrack.artist || 'Unknown Artist' : null
				})
			});
			if (res.ok) {
				const status = await res.json();
				this.listenersCount = status.listeners_count;
			}
		} catch (e) {
			console.warn('Backend broadcast state sync failed:', e);
		}
	}

	private async fetchStatusFromBackend() {
		try {
			const res = await fetch('/api/radio/broadcast/status');
			if (res.ok) {
				const status = await res.json();
				this.listenersCount = status.listeners_count;
				this.isBroadcasting = status.is_broadcasting;
				this.stationName = status.station_name;
				this.stationGenre = status.station_genre;
				this.playbackMode = status.mode;
				this.selectedFolders = status.selected_folders;
				this.icyMetadata = status.icy_metadata || this.icyMetadata;
				if (status.current_title && (!this.currentTrack || this.currentTrack.title !== status.current_title)) {
					this.currentTrack = {
						id: this.currentTrack?.id || 0,
						path: status.current_path || this.currentTrack?.path || '',
						name: status.current_title,
						title: status.current_title,
						info_title: status.current_title,
						artist: status.current_artist || 'Live Radio',
						album: this.currentTrack?.album || null,
						size_str: this.currentTrack?.size_str || '',
						cat: 'audio',
						mime: 'audio/mpeg',
						subs: false,
						dur: this.currentTrack?.dur || null,
						info_overview: null,
						info_art: false,
						ext: 'mp3'
					};
				}
			}
		} catch { }
	}
}

function isSubPath(itemPath: string, dirPath: string): boolean {
	const normItem = itemPath.replace(/\\/g, '/').toLowerCase();
	const normDir = dirPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
	return normItem.startsWith(normDir + '/') || normItem === normDir;
}

function shuffleArray<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export const radioBroadcastStore = new RadioBroadcastStore();
