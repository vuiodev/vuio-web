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
	/**
	 * Play this URL instead of `/media/{id}`.
	 *
	 * A live station has no library record to stream from — and when it belongs
	 * to another VuIO server, no record here at all — so it carries the absolute
	 * URL of its own stream.
	 */
	stream_url?: string;
}

/** How a station orders its queue. */
export type BroadcastMode = 'linear' | 'shuffle' | 'loop';

/**
 * A station this server broadcasts, as the studio sees it.
 *
 * `enabled` is what the operator asked for and survives a restart; `is_live` is
 * whether it is actually on the air right now. They differ only while a station
 * is failing to start.
 */
export interface RadioStation {
	id: number;
	name: string;
	genre: string;
	folders: string[];
	mode: BroadcastMode;
	enabled: boolean;
	is_live: boolean;
	codec?: string;
	listeners: number;
	uptime_secs: number;
	queue_len: number;
	/** Files in those folders that cannot be broadcast without re-encoding. */
	skipped_files: number;
	now_playing?: {
		title: string;
		artist: string | null;
		path: string | null;
		started_at_epoch_secs: number;
	};
	stream_url?: string;
}

/** A live station as any server publishes it. */
export interface PublishedStation {
	id: number;
	name: string;
	genre: string;
	codec: string;
	stream_url: string;
	listeners: number;
	uptime_secs: number;
	now_playing?: string;
	artist?: string;
	title?: string;
}

/** One VuIO server on the network, and what it is broadcasting. */
export interface RadioPeer {
	uuid: string;
	name: string;
	address: string;
	is_self: boolean;
	stations: PublishedStation[];
}

export interface MediaPageResponse {
	files: MediaItem[];
	next_cursor: string | null;
}

/** A subfolder of the directory being browsed. */
export interface FolderEntry {
	name: string;
	/** Absolute path, as the server stores it. Pass it straight back to browse into it. */
	path: string;
	/**
	 * How many matching files the folder's whole subtree holds — a folder whose
	 * media all sits in grandchildren is not empty. `null` when the server has
	 * no counter for the active filter, which today means the radio category.
	 */
	file_count: number | null;
}

/**
 * One directory's direct children, folders first.
 *
 * The server answers this from an index on the parent path, so the response is
 * the same size and takes the same time whether the library holds a hundred
 * files or ten million. That is the whole reason it exists: the folder tree
 * cannot be rebuilt in the browser from a page of files, because the folders to
 * group by are spread across pages that have not been fetched.
 */
export interface BrowseResponse {
	/** The directory being listed, or `null` at the top, which lists the media roots. */
	path: string | null;
	parent: string | null;
	folders: FolderEntry[];
	files: MediaItem[];
	/** Folders plus files in this directory — not the size of the page. */
	total: number;
	offset: number;
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

/**
 * `/metrics/json`, as the server actually sends it.
 *
 * Everything below the top level is optional in practice: `runtime_diagnostics`
 * is only populated when the server was built with the `diagnostics` feature,
 * and a field that is missing must render as "—" rather than being called into.
 * Reading a number that was never there is what used to take this whole screen
 * down.
 */
export interface ServerMetrics {
	web_handler_metrics: {
		browse_requests: number;
		cache_hits: number;
		cache_misses: number;
		cache_hit_rate_percent: number;
		directory_listings: number;
		file_serves: number;
		errors: number;
		average_response_time_ms: number;
		gigabytes_transferred: number;
		database_backend: string;
	};
	database_stats: {
		total_files: number;
		total_size_bytes: number;
		database_size_bytes: number;
		video_files: number;
		audio_files: number;
		image_files: number;
		playlists: number;
	};
	runtime_diagnostics: {
		/** `null` when the server was built without the `diagnostics` feature. */
		snapshot: {
			system: {
				uptime_seconds: number;
				total_memory_bytes: number;
				available_memory_bytes: number;
				cpu_count: number;
				global_cpu_usage_percent: number;
				load_average_one: number;
				load_average_five: number;
				load_average_fifteen: number;
			};
			process: {
				pid: number;
				memory_bytes?: number | null;
				virtual_memory_bytes?: number | null;
				cpu_usage_percent?: number | null;
				runtime_seconds?: number | null;
				thread_count?: number | null;
				open_files?: number | null;
			};
			disks: { filesystems: number; total_bytes: number; available_bytes: number };
			network: {
				interfaces: number;
				total_received_bytes: number;
				total_transmitted_bytes: number;
				receive_errors: number;
				transmit_errors: number;
				maximum_mtu: number;
			};
		} | null;
		monitored_directory_count: number;
		accessible_directory_count: number;
		watch_for_changes: boolean;
		scan_on_startup: boolean;
		platform: string;
		architecture: string;
		unavailable_or_incomplete_roots: UnavailableRoot[];
	};
	active_casts: unknown[];
}

/** A configured library the server currently cannot read. */
export interface UnavailableRoot {
	path: string;
	last_seen_secs: number;
	unavailable_since_secs?: number | null;
	indexed_count: number;
	reason: string;
}

/** Where a provider's credential comes from. */
export type CredentialSource = 'user' | 'environment' | 'none';

export interface MediaInfoProvider {
	id: string;
	label: string;
	group: string;
	provides: string;
	credential_label?: string;
	signup_url?: string;
	needs_credential: boolean;
	/** Whether a key was saved from here — so whether Clear has anything to do. */
	has_credential: boolean;
	/** Which key is actually in force, which `has_credential` cannot say. */
	credential_source: CredentialSource;
	/** The variable a key can be supplied in, for providers that take one. */
	credential_env_var?: string;
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

/**
 * `/api/admin/config`, the schema the settings editor is built from.
 *
 * The server describes its own settings — which exist, what type each is, what
 * changing one costs — so a setting added in Rust appears here with no change on
 * this side. Nothing in the editor hard-codes a key.
 */
export interface ConfigSchema {
	sections: ConfigSection[];
	/** Dotted key → the value to edit: the file's, or the default in force. */
	values: Record<string, unknown>;
	/** Dotted key → whether the *file* sets it, as opposed to it having a value. */
	present: Record<string, boolean>;
	/** Dotted key → a value the command line is forcing for this run. */
	overrides: Record<string, string>;
	/** Libraries exactly as the file writes them. This is what gets edited. */
	directories: LibraryEntry[];
	/** The same libraries with defaults filled in, for display only. */
	effective_directories: LibraryEntry[];
	library_defaults: { exclude_patterns: string[] };
	runtime: ConfigRuntime;
}

export interface ConfigSection {
	id: string;
	title: string;
	blurb: string;
	fields: ConfigField[];
	/** Rendered as the repeatable libraries editor rather than a list of fields. */
	directories?: boolean;
	/** Carries an action panel below its fields (MediaInfo's credentials). */
	panel?: boolean;
}

/**
 * The type is flattened into the field itself, tagged `type` — so a boolean is
 * `{type: 'bool', …}` and an integer is `{type: 'int', min, max, …}`.
 */
export type ConfigFieldKind =
	| { type: 'bool' }
	| { type: 'int'; min: number; max: number }
	| { type: 'text' }
	| { type: 'path' }
	| { type: 'enum'; options: string[]; free_form: boolean }
	| { type: 'string_list' };

export type ConfigField = ConfigFieldKind & {
	key: string;
	label: string;
	/** `live` applies immediately; the others need a restart. */
	impact: 'live' | 'restart' | 'next_start';
	help: string;
	/** Whether the key may be left out of the file to fall back to a default. */
	removable: boolean;
	/** A caveat about what the setting actually does. */
	note?: string;
};

export interface LibraryEntry {
	path: string;
	recursive?: boolean;
	case_sensitive?: boolean | null;
	extensions?: string[] | null;
	exclude_patterns?: string[] | null;
	validation_mode?: string;
}

export interface ConfigRuntime {
	config_path: string;
	/** False for a scratch config a restart discards — the container case. */
	writable: boolean;
	read_only_reason?: string | null;
	auth_enabled: boolean;
	is_docker: boolean;
	version: string;
	bound_addr?: string | null;
	desired_addr?: string | null;
	bind_error?: string | null;
}
