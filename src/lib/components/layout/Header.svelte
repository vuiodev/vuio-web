<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { castStore } from '$lib/stores/castStore.svelte';
	import type { MediaCategory } from '$lib/api/types';
	import {
		Film,
		Music,
		Image,
		Radio,
		Grid,
		List,
		Tv,
		Search,
		Settings,
		Home,
		Cast
	} from '@lucide/svelte';

	let { activeTab = $bindable('home') } = $props();
	let searchInput = $state('');

	function handleCategoryClick(cat: MediaCategory | 'home' | 'admin') {
		activeTab = cat;
		if (cat !== 'home' && cat !== 'admin') {
			mediaStore.setCategory(cat as MediaCategory);
		}
	}

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchInput = target.value;
		mediaStore.setSearch(searchInput);
		if (activeTab === 'home' || activeTab === 'admin') {
			activeTab = 'all';
		}
	}
</script>

<header class="glass-panel header-bar">
	<div class="brand-section">
		<div class="logo-badge">
			<Film size={22} class="logo-icon" />
			<span class="brand-name">VuIO<span class="brand-accent">Web</span></span>
		</div>
	</div>

	<nav class="nav-tabs">
		<button
			class="nav-tab {activeTab === 'home' ? 'active' : ''}"
			onclick={() => handleCategoryClick('home')}
		>
			<Home size={18} />
			<span>Home</span>
		</button>
		<button
			class="nav-tab {activeTab === 'video' ? 'active' : ''}"
			onclick={() => handleCategoryClick('video')}
		>
			<Tv size={18} />
			<span>Movies & TV</span>
		</button>
		<button
			class="nav-tab {activeTab === 'audio' ? 'active' : ''}"
			onclick={() => handleCategoryClick('audio')}
		>
			<Music size={18} />
			<span>Music</span>
		</button>
		<button
			class="nav-tab {activeTab === 'image' ? 'active' : ''}"
			onclick={() => handleCategoryClick('image')}
		>
			<Image size={18} />
			<span>Photos</span>
		</button>
		<button
			class="nav-tab {activeTab === 'radio' ? 'active' : ''}"
			onclick={() => handleCategoryClick('radio')}
		>
			<Radio size={18} />
			<span>Radio</span>
		</button>
		<button
			class="nav-tab {activeTab === 'admin' ? 'active' : ''}"
			onclick={() => handleCategoryClick('admin')}
		>
			<Settings size={18} />
			<span>Admin</span>
		</button>
	</nav>

	<div class="header-actions">
		<div class="search-box">
			<Search size={16} class="search-icon" />
			<input
				type="text"
				placeholder="Search movies, songs, artists..."
				value={searchInput}
				oninput={handleSearchInput}
			/>
		</div>

		<button
			class="btn btn-secondary btn-icon"
			title="Cast to Device"
			onclick={() => castStore.openCastModal()}
		>
			<Cast size={18} class={castStore.isCasting ? 'text-cyan' : ''} />
		</button>

		<button
			class="btn btn-secondary btn-icon"
			title="Toggle View Mode"
			onclick={() => mediaStore.toggleViewMode()}
		>
			{#if mediaStore.viewMode === 'grid'}
				<List size={18} />
			{:else}
				<Grid size={18} />
			{/if}
		</button>
	</div>
</header>

<style>
	.header-bar {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 28px;
		gap: 20px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		width: 100%;
	}

	.brand-section {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.logo-badge {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	:global(.logo-icon) {
		color: var(--accent-cyan);
	}

	.brand-name {
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: -0.5px;
	}

	.brand-accent {
		color: var(--accent-cyan);
		font-weight: 400;
		margin-left: 2px;
	}

	.nav-tabs {
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.3);
		padding: 4px;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-glass);
		flex-shrink: 0;
	}

	.nav-tab {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-radius: var(--radius-full);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
		white-space: nowrap;
	}

	.nav-tab:hover {
		color: var(--text-main);
		background: rgba(255, 255, 255, 0.06);
	}

	.nav-tab.active {
		color: #ffffff;
		background: linear-gradient(135deg, var(--accent-cyan), #007bb6);
		box-shadow: 0 2px 10px rgba(0, 164, 220, 0.3);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.search-box {
		position: relative;
		display: flex;
		align-items: center;
		width: 240px;
	}

	:global(.search-icon) {
		position: absolute;
		left: 12px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-box input {
		width: 100%;
		padding: 8px 14px 8px 36px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.85rem;
		outline: none;
		transition: var(--transition-smooth);
	}

	.search-box input:focus {
		border-color: var(--accent-cyan);
		background: rgba(255, 255, 255, 0.1);
		box-shadow: 0 0 12px rgba(0, 164, 220, 0.25);
	}

	:global(.text-cyan) {
		color: var(--accent-cyan);
	}

	@media (max-width: 900px) {
		.header-bar {
			padding: 10px 16px;
		}
		.nav-tab span {
			display: none;
		}
		.search-box {
			width: 160px;
		}
	}
</style>
