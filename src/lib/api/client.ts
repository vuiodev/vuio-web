import type {
	MediaPageResponse,
	ServerInfo,
	CastRenderer,
	WebMetrics,
	MediaInfoStatus
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

export async function fetchMetrics(): Promise<WebMetrics | null> {
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

export async function fetchConfig(): Promise<any> {
	const res = await fetch('/api/admin/config');
	if (!res.ok) throw new Error('Failed to fetch config');
	return res.json();
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
