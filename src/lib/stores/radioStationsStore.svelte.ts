import type { MediaItem, RadioPeer, RadioStation } from '../api/types';
import {
	createStation,
	deleteStation,
	fetchRadioPeers,
	fetchStations,
	skipTrack,
	startStation,
	stopStation,
	updateStation,
	type StationDraft
} from '../api/client';
import { playerStore } from './playerStore.svelte';

/**
 * Stations, as the server reports them.
 *
 * This store holds no playback state of its own. The server owns the queue, the
 * clock and the track changes; a station keeps playing whether or not this page
 * is open, and closing the tab is not an event a listener can hear. All the
 * store does is show what the server says and send it instructions.
 */
class RadioStationsStore {
	stations = $state<RadioStation[]>([]);
	peers = $state<RadioPeer[]>([]);

	loading = $state<boolean>(false);
	discovering = $state<boolean>(false);
	error = $state<string | null>(null);

	/** Which station the operator is monitoring, if any. */
	listeningTo = $state<string | null>(null);

	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private pollers = 0;

	get liveStations(): RadioStation[] {
		return this.stations.filter((station) => station.is_live);
	}

	async load() {
		this.loading = true;
		try {
			this.stations = await fetchStations();
			this.error = null;
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Look for stations on this server and its neighbours.
	 *
	 * `background` keeps the spinner off during the poll that follows the first
	 * load, so an open tab does not flicker every few seconds.
	 */
	async discover(background = false) {
		if (!background) this.discovering = true;
		try {
			this.peers = await fetchRadioPeers();
			this.error = null;
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.discovering = false;
		}
	}

	/**
	 * Refresh while a tab that shows live figures is open.
	 *
	 * Reference-counted so two tabs sharing the store do not run two timers, and
	 * so leaving both stops the polling entirely.
	 */
	startPolling(refresh: () => Promise<void>, everyMs = 5000) {
		this.pollers += 1;
		if (this.pollTimer) return;
		this.pollTimer = setInterval(() => {
			refresh().catch(() => {});
		}, everyMs);
	}

	stopPolling() {
		this.pollers = Math.max(0, this.pollers - 1);
		if (this.pollers === 0 && this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
	}

	async create(draft: StationDraft): Promise<RadioStation | null> {
		return this.mutate(async () => {
			const station = await createStation(draft);
			this.stations = [...this.stations, station];
			return station;
		});
	}

	async save(id: number, draft: StationDraft): Promise<RadioStation | null> {
		return this.mutate(async () => {
			const station = await updateStation(id, draft);
			this.replace(station);
			return station;
		});
	}

	async start(id: number): Promise<RadioStation | null> {
		return this.mutate(async () => {
			const station = await startStation(id);
			this.replace(station);
			return station;
		});
	}

	async stop(id: number): Promise<RadioStation | null> {
		return this.mutate(async () => {
			const station = await stopStation(id);
			this.replace(station);
			if (this.listeningTo && station.stream_url === this.listeningTo) {
				this.stopListening();
			}
			return station;
		});
	}

	async skip(id: number): Promise<RadioStation | null> {
		return this.mutate(async () => {
			const station = await skipTrack(id);
			this.replace(station);
			return station;
		});
	}

	async remove(id: number): Promise<void> {
		await this.mutate(async () => {
			await deleteStation(id);
			this.stations = this.stations.filter((station) => station.id !== id);
			return null;
		});
	}

	/**
	 * Start monitoring a station.
	 *
	 * Never called on the operator's behalf: putting a station on the air is an
	 * instruction to the server, not a reason to start playing audio in whatever
	 * browser happened to send it. Listening is a separate, deliberate act — and
	 * when it happens, it is an ordinary listener like any other.
	 */
	listen(station: { name: string; genre?: string; stream_url?: string }, subtitle?: string) {
		if (!station.stream_url) return;
		this.listeningTo = station.stream_url;

		const item: MediaItem = {
			id: -1,
			path: station.stream_url,
			name: station.name,
			title: station.name,
			artist: subtitle ?? station.genre ?? 'Live broadcast',
			album: null,
			size_str: '',
			ext: '',
			cat: 'radio',
			mime: 'audio/radio',
			subs: false,
			dur: null,
			info_title: null,
			info_overview: null,
			info_art: false,
			stream_url: station.stream_url
		};
		playerStore.playAudio(item, [item]);
	}

	stopListening() {
		this.listeningTo = null;
		playerStore.stopAudio();
	}

	isListeningTo(streamUrl: string | undefined): boolean {
		return !!streamUrl && this.listeningTo === streamUrl;
	}

	private replace(station: RadioStation) {
		this.stations = this.stations.map((existing) =>
			existing.id === station.id ? station : existing
		);
	}

	private async mutate<T>(action: () => Promise<T>): Promise<T | null> {
		try {
			const result = await action();
			this.error = null;
			return result;
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
			return null;
		}
	}
}

export const radioStationsStore = new RadioStationsStore();
