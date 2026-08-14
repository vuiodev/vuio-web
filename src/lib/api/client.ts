import type {
	BrowseResponse,
	ConfigSchema,
	MediaPageResponse,
	ServerInfo,
	CastRenderer,
	ServerMetrics,
	MediaInfoStatus,
	RadioStation,
	RadioPeer,
	BroadcastMode
} from './types';

export function getMediaStreamUrl(id: number): string {
	return `/media/${id}`;
}

export function getCoverUrl(id: number): string {
	return `/media/${id}/cover`;
}

export function getHlsMasterUrl(id: number): string {
	return `/media/${id}/hls/master.m3u8`;
}

export function getSubtitleVttUrl(id: number): string {
	return `/media/${id}/subtitle.vtt`;
}

export async function fetchServerInfo(): Promise<ServerInfo> {
	const res = await fetch('/api/server-info');
	if (!res.ok) throw new Error(`Server info error: ${res.statusText}`);
	return res.json();
}

export async function fetchMediaPage(
	category = 'all',
	query = '',
	cursor: string | null = null,
	limit = 100
): Promise<MediaPageResponse> {
	const params = new URLSearchParams();
	if (category && category !== 'all') params.set('category', category);
	if (query.trim()) params.set('query', query.trim());
	if (cursor) params.set('cursor', cursor);
	params.set('limit', limit.toString());

	const res = await fetch(`/api/media?${params.toString()}`);
	if (!res.ok) throw new Error(`Media fetch error: ${res.statusText}`);
	return res.json();
}

/**
 * List one directory: its subfolders, then its files.
 *
 * Pass `null` for the top of the tree, which lists the configured media roots.
 * Paging is by offset rather than by cursor because folders and files are one
 * ordered listing; an offset here is bounded by the size of a single directory
 * rather than of the library, so it stays cheap however large the library is.
 */
export async function fetchBrowse(
	path: string | null,
	category = 'all',
	offset = 0,
	limit = 250
): Promise<BrowseResponse> {
	const params = new URLSearchParams();
	if (path) params.set('path', path);
	if (category && category !== 'all') params.set('category', category);
	params.set('offset', offset.toString());
	params.set('limit', limit.toString());

	const res = await fetch(`/api/browse?${params.toString()}`);
	if (!res.ok) throw new Error(`Browse error: ${res.statusText}`);
	return res.json();
}

export async function fetchRenderers(): Promise<CastRenderer[]> {
	try {
		const res = await fetch('/api/renderers');
		if (!res.ok) return [];
		return res.json();
	} catch {
		return [];
	}
}

export async function castMedia(rendererId: string, mediaId: number): Promise<boolean> {
	const res = await fetch('/api/cast', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ renderer_id: rendererId, media_id: mediaId })
	});
	return res.ok;
}

export async function castControl(rendererId: string, action: 'play' | 'pause' | 'stop' | 'seek', position_secs?: number): Promise<boolean> {
	const res = await fetch('/api/cast/control', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ renderer_id: rendererId, action, position_secs })
	});
	return res.ok;
}

export async function fetchMetrics(): Promise<ServerMetrics | null> {
	try {
		const res = await fetch('/metrics/json');
		if (!res.ok) return null;
		return res.json();
	} catch {
		return null;
	}
}

export async function fetchLogs(): Promise<string> {
	try {
		const res = await fetch('/logs');
		if (!res.ok) return 'Failed to load server logs';
		return res.text();
	} catch (e: any) {
		return `Error connecting to logs endpoint: ${e.message}`;
	}
}

export async function fetchConfig(): Promise<ConfigSchema> {
	const res = await fetch('/api/admin/config');
	if (!res.ok) throw new Error(`Failed to fetch config: ${res.statusText}`);
	return res.json();
}

/**
 * Save changed settings.
 *
 * Send only what changed: a key mapped to `null` is removed from the file,
 * restoring whatever default applies, and omitting `directories` entirely leaves
 * the libraries alone. Sending them back unchanged would rewrite the array and
 * freeze this version's platform defaults into the operator's file.
 */
export async function saveConfig(update: {
	values: Record<string, unknown>;
	directories?: unknown[];
}): Promise<void> {
	const res = await fetch('/api/admin/config', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(update)
	});
	if (!res.ok) {
		// The server explains itself — unknown key, a required value removed —
		// and that message is far more useful than the status code.
		throw new Error(await errorMessage(res, 'Failed to save configuration'));
	}
}

/** Stop the server. Something else has to start it again; `supervised` says whether. */
export async function restartServer(): Promise<{ supervised: boolean }> {
	const res = await fetch('/api/admin/restart', { method: 'POST' });
	if (!res.ok) throw new Error(await errorMessage(res, 'Failed to restart'));
	return res.json();
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
	try {
		const body = await res.json();
		return body?.error ?? fallback;
	} catch {
		return `${fallback}: ${res.statusText}`;
	}
}

export async function fetchMediaInfoStatus(): Promise<MediaInfoStatus | null> {
	try {
		const res = await fetch('/api/admin/mediainfo');
		if (!res.ok) return null;
		return res.json();
	} catch {
		return null;
	}
}

export async function runMediaInfo(): Promise<boolean> {
	const res = await fetch('/api/admin/mediainfo/run', { method: 'POST' });
	return res.ok;
}

export async function cancelMediaInfo(): Promise<boolean> {
	const res = await fetch('/api/admin/mediainfo/cancel', { method: 'POST' });
	return res.ok;
}

/**
 * Save a provider API key, or clear it by sending an empty token.
 *
 * Clearing does not disable the provider: it falls back to a key supplied to the
 * server through `VUIO_<ID>_API_KEY`, if there is one.
 */
export async function saveCredential(provider: string, token: string): Promise<void> {
	const res = await fetch('/api/admin/mediainfo/credentials', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ provider, token })
	});
	if (!res.ok) throw new Error(await errorMessage(res, 'Failed to save the key'));
}

// --- Live radio -------------------------------------------------------------

/**
 * Read the reason a radio request was refused.
 *
 * These handlers answer with a plain-text sentence rather than a JSON envelope,
 * because the message is written for the operator to read: "none of the 12
 * file(s) in those folders can be broadcast" is the whole answer.
 */
async function radioError(res: Response, fallback: string): Promise<string> {
	try {
		const text = (await res.text()).trim();
		return text.length > 0 ? text : `${fallback}: ${res.statusText}`;
	} catch {
		return `${fallback}: ${res.statusText}`;
	}
}

/** Every station this server has, on the air or not. */
export async function fetchStations(): Promise<RadioStation[]> {
	const res = await fetch('/api/radio/admin/stations');
	if (!res.ok) throw new Error(await radioError(res, 'Could not load the stations'));
	return res.json();
}

/**
 * Every live station on the network, this server's own first.
 *
 * Discovery is an mDNS browse on the server side, cached for a few seconds, so
 * polling this while the tab is open is cheap.
 */
export async function fetchRadioPeers(localOnly = false): Promise<RadioPeer[]> {
	const res = await fetch(`/api/radio/peers${localOnly ? '?local_only=true' : ''}`);
	if (!res.ok) throw new Error(await radioError(res, 'Could not look for stations'));
	return res.json();
}

export interface StationDraft {
	name: string;
	genre: string;
	folders: string[];
	mode: BroadcastMode;
}

export async function createStation(draft: StationDraft): Promise<RadioStation> {
	const res = await fetch('/api/radio/admin/stations', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(draft)
	});
	if (!res.ok) throw new Error(await radioError(res, 'Could not create the station'));
	return res.json();
}

export async function updateStation(id: number, draft: StationDraft): Promise<RadioStation> {
	const res = await fetch(`/api/radio/admin/stations/${id}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(draft)
	});
	if (!res.ok) throw new Error(await radioError(res, 'Could not save the station'));
	return res.json();
}

/** Put a station on the air. It stays there across restarts until stopped. */
export async function startStation(id: number): Promise<RadioStation> {
	const res = await fetch(`/api/radio/admin/stations/${id}/start`, { method: 'POST' });
	if (!res.ok) throw new Error(await radioError(res, 'Could not start the station'));
	return res.json();
}

export async function stopStation(id: number): Promise<RadioStation> {
	const res = await fetch(`/api/radio/admin/stations/${id}/stop`, { method: 'POST' });
	if (!res.ok) throw new Error(await radioError(res, 'Could not stop the station'));
	return res.json();
}

export async function skipTrack(id: number): Promise<RadioStation> {
	const res = await fetch(`/api/radio/admin/stations/${id}/skip`, { method: 'POST' });
	if (!res.ok) throw new Error(await radioError(res, 'Could not skip the track'));
	return res.json();
}

export async function deleteStation(id: number): Promise<void> {
	const res = await fetch(`/api/radio/admin/stations/${id}/delete`, { method: 'POST' });
	if (!res.ok) throw new Error(await radioError(res, 'Could not delete the station'));
}
