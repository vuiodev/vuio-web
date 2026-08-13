export type MediaCategory = 'all' | 'audio' | 'video' | 'image' | 'radio';

export interface MediaItem {
	id: number;
	path: string;
	name: string;
	title: string | null;
	artist: string | null;
	album: string | null;
	size_str: string;
	ext: string;
	cat: 'audio' | 'video' | 'image' | 'radio' | string;
	mime: string;
	subs: boolean;
	dur: number | null;
	info_title: string | null;
	info_overview: string | null;
	info_art: boolean;
}

export interface MediaPageResponse {
	files: MediaItem[];
	next_cursor: string | null;
}

export interface ServerInfo {
	server_name: string;
	monitored_directories: string[];
	auth_enabled: boolean;
	library_revision: number;
}

export interface CastRenderer {
	id: string;
	name: string;
	device_type: string;
	ip: string;
}

export interface WebMetrics {
	browse_requests: number;
	cache_hits: number;
	cache_misses: number;
	directory_listings: number;
	file_serves: number;
	errors: number;
	avg_response_time_ms: number;
	bytes_transferred: number;
	bytes_transferred_str: string;
}

export interface MediaInfoProvider {
	id: string;
	label: string;
	group: string;
	provides: string;
	credential_label?: string;
	signup_url?: string;
	needs_credential: boolean;
	has_credential: boolean;
	enabled: boolean;
}

export interface MediaInfoJob {
	running: boolean;
	total: number;
	processed: number;
	matched: number;
	low_confidence: number;
	failed: number;
	cancelled: boolean;
	current?: string;
	started_at?: number;
	finished_at?: number;
	last_error?: string;
}

export interface MediaInfoStatus {
	providers: MediaInfoProvider[];
	job: MediaInfoJob;
	low_confidence_matches: any[];
}
