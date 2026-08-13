import type { BrowseResponse, FolderEntry, MediaItem, MediaCategory } from '../api/types';
import { fetchBrowse, fetchMediaPage, fetchServerInfo } from '../api/client';

const PAGE_SIZE = 250;

export interface Crumb {
	label: string;
	/** `null` is the top of the tree: the list of media roots. */
	path: string | null;
}

/**
 * The library, in the two shapes it is actually looked at.
 *
 * **Browsing** asks the server for one directory at a time (`/api/browse`).
 * The folder tree deliberately never enters the browser: it is spread across
 * the whole media table, so grouping a page of files by folder — which is what
 * this store used to do — does not merely get slow on a large library, it gets
 * the answer wrong, showing whichever folders happened to appear in the pages
 * fetched so far.
 *
 * **Searching** is the one question that is genuinely library-wide, so it uses
 * the flat cursor-paged listing (`/api/media`) instead. Typing a query switches
 * modes; clearing it returns to the directory that was open.
 */
class MediaStore {
	category = $state<MediaCategory>('all');
	searchQuery = $state<string>('');
	isLoading = $state<boolean>(false);
	selectedItem = $state<MediaItem | null>(null);
	viewMode = $state<'grid' | 'list'>('grid');
	monitoredDirs = $state<string[]>([]);

	// Browsing.
	path = $state<string | null>(null);
	parent = $state<string | null>(null);
	folders = $state<FolderEntry[]>([]);
	files = $state<MediaItem[]>([]);
	total = $state<number>(0);

	// Searching.
	items = $state<MediaItem[]>([]);
	nextCursor = $state<string | null>(null);

	searching = $derived(this.searchQuery.trim().length > 0);

	/** What the grid renders, and the queue the players are handed. */
	visibleFiles = $derived(this.searching ? this.items : this.files);

	/** Everything in the current view, which is not the same as what is loaded. */
	itemCount = $derived(this.searching ? this.items.length : this.total);

	hasMore = $derived(
		this.searching
			? this.nextCursor !== null
			: this.folders.length + this.files.length < this.total
	);

	/**
	 * The trail back to the top. Derived from the current path alone — a string
	 * split of bounded depth, not an aggregation over the library.
	 */
	crumbs = $derived.by<Crumb[]>(() => {
		if (!this.path) return [];
		const root = this.monitoredDirs.find((dir) => isInside(this.path!, dir));
		if (!root) return [{ label: basename(this.path), path: this.path }];

		const crumbs: Crumb[] = [{ label: basename(root) || root, path: root }];
		const separator = this.path.includes('\\') && !this.path.includes('/') ? '\\' : '/';
		let walked = trimTrailing(root);
		for (const segment of split(this.path.slice(root.length))) {
			walked = `${walked}${separator}${segment}`;
			crumbs.push({ label: segment, path: walked });
		}
		return crumbs;
	});

	async initServerInfo() {
		try {
			const info = await fetchServerInfo();
			this.monitoredDirs = info.monitored_directories || [];
		} catch {
			this.monitoredDirs = [];
		}
	}

	/**
	 * Open the library at the top. With a single media root there is nothing to
	 * choose between, so it descends straight into it rather than making the
	 * first screen a list of one.
	 */
	async load() {
		await this.loadBrowse(null);
		if (!this.path && this.folders.length === 1 && this.files.length === 0) {
			await this.loadBrowse(this.folders[0].path);
		}
	}

	async loadBrowse(path: string | null, append = false) {
		this.isLoading = true;
		try {
			const offset = append ? this.folders.length + this.files.length : 0;
			const page: BrowseResponse = await fetchBrowse(path, this.category, offset, PAGE_SIZE);
			if (append) {
				this.folders = [...this.folders, ...page.folders];
				this.files = [...this.files, ...page.files];
			} else {
				this.folders = page.folders;
				this.files = page.files;
			}
			this.path = page.path;
			this.parent = page.parent;
			this.total = page.total;
		} catch (error) {
			console.error('Failed to browse:', error);
			if (!append) {
				this.folders = [];
				this.files = [];
				this.total = 0;
			}
		} finally {
			this.isLoading = false;
		}
	}

	async loadSearch(append = false) {
		this.isLoading = true;
		try {
			const cursor = append ? this.nextCursor : null;
			const page = await fetchMediaPage(this.category, this.searchQuery, cursor, PAGE_SIZE);
			this.items = append ? [...this.items, ...page.files] : page.files;
			this.nextCursor = page.next_cursor;
		} catch (error) {
			console.error('Failed to search:', error);
			if (!append) {
				this.items = [];
				this.nextCursor = null;
			}
		} finally {
			this.isLoading = false;
		}
	}

	loadMore() {
		return this.searching ? this.loadSearch(true) : this.loadBrowse(this.path, true);
	}

	setCategory(category: MediaCategory) {
		this.category = category;
		// The filter narrows the current directory rather than leaving it: a
		// folder that holds no video simply stops being offered.
		return this.searching ? this.loadSearch() : this.loadBrowse(this.path);
	}

	setSearch(query: string) {
		const wasSearching = this.searching;
		this.searchQuery = query;
		if (this.searching) return this.loadSearch();
		// Cleared: drop back into the directory that was open.
		this.items = [];
		this.nextCursor = null;
		return wasSearching ? this.loadBrowse(this.path) : Promise.resolve();
	}

	enterFolder(path: string) {
		return this.loadBrowse(path);
	}

	goUp() {
		return this.loadBrowse(this.parent);
	}

	goToRoots() {
		return this.loadBrowse(null);
	}

	selectItem(item: MediaItem | null) {
		this.selectedItem = item;
	}

	toggleViewMode() {
		this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
	}
}

function split(path: string): string[] {
	return path.split(/[/\\]/).filter((segment) => segment.length > 0);
}

function basename(path: string | null): string {
	if (!path) return '';
	const segments = split(path);
	return segments[segments.length - 1] ?? path;
}

function trimTrailing(path: string): string {
	return path.replace(/[/\\]+$/, '');
}

function isInside(path: string, root: string): boolean {
	const trimmed = trimTrailing(root);
	if (path === trimmed) return true;
	const next = path[trimmed.length];
	return path.startsWith(trimmed) && (next === '/' || next === '\\');
}

export const mediaStore = new MediaStore();
