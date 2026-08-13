<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchConfig, saveConfig, restartServer } from '$lib/api/client';
	import type { ConfigSchema, LibraryEntry } from '$lib/api/types';
	import ConfigField from './ConfigField.svelte';
	import LibraryCard from './LibraryCard.svelte';
	import { Save, RotateCw, Plus, Loader2, AlertTriangle, Lock, Check } from '@lucide/svelte';

	// The editor is built entirely from the schema the server sends: it knows
	// which settings exist, what type each is and what changing one costs. A
	// setting added in Rust therefore appears here with no change on this side,
	// which is the property that makes it worth driving off the schema at all.
	let schema = $state<ConfigSchema | null>(null);
	let activeSection = $state<string>('');
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);
	let saving = $state(false);
	let loading = $state(true);

	// Edited state, kept apart from the schema so "what changed" stays knowable
	// and only changed keys are sent.
	let values = $state<Record<string, unknown>>({});
	let present = $state<Record<string, boolean>>({});
	let libraries = $state<LibraryEntry[]>([]);

	let readOnly = $derived(schema?.runtime.writable === false);

	// Compared against the baseline rather than tracked with a flag: a card edits
	// its entry in place, and a flag would have to be threaded back up through
	// every field of every card to notice. `libraries` is deep state, so this
	// re-runs on a nested change, and the arrays are a handful of entries long.
	let librariesTouched = $derived(
		schema ? JSON.stringify(libraries) !== JSON.stringify(schema.directories ?? []) : false
	);

	// A key with no presence entry is assumed set. The server sends one per key
	// when it can read the config file and an empty map when it cannot — and of
	// the two ways to be wrong there, proposing to write back a value already in
	// force is harmless, while proposing to delete a required key is a save that
	// fails or a config that no longer loads.
	function isSet(map: Record<string, boolean>, key: string): boolean {
		return map[key] ?? true;
	}

	let changedKeys = $derived.by(() => {
		if (!schema) return [] as string[];
		return Object.keys(values).filter((key) => {
			const wasPresent = isSet(schema!.present, key);
			const isPresent = isSet(present, key);
			if (wasPresent !== isPresent) return true;
			if (!isPresent) return false;
			return JSON.stringify(values[key]) !== JSON.stringify(schema!.values[key]);
		});
	});

	let dirty = $derived(changedKeys.length > 0 || librariesTouched);

	// A restart is only worth offering when something that needs one has changed.
	let needsRestart = $derived.by(() => {
		if (!schema) return false;
		const fields = schema.sections.flatMap((section) => section.fields);
		return changedKeys.some(
			(key) => fields.find((field) => field.key === key)?.impact !== 'live'
		);
	});

	onMount(load);

	async function load() {
		loading = true;
		error = null;
		try {
			const next = await fetchConfig();
			schema = next;
			// Structured clones, so editing never mutates the baseline that
			// `changedKeys` compares against.
			values = structuredClone(next.values);
			present = structuredClone(next.present);
			libraries = structuredClone(next.directories ?? []);
			if (!activeSection) activeSection = next.sections[0]?.id ?? '';
		} catch (e: any) {
			error = e?.message ?? 'Could not load the configuration';
		} finally {
			loading = false;
		}
	}

	async function save() {
		if (!schema || saving) return;
		saving = true;
		error = null;
		notice = null;
		try {
			const changed: Record<string, unknown> = {};
			for (const key of changedKeys) {
				// An unset key is sent as null, which removes it from the file and
				// restores whatever default applies.
				changed[key] = present[key] ? values[key] : null;
			}
			await saveConfig({
				values: changed,
				// Omitted unless edited: sending them back would rewrite the array
				// and bake this version's defaults into the operator's file.
				...(librariesTouched ? { directories: libraries } : {})
			});
			notice = 'Saved.';
			await load();
		} catch (e: any) {
			error = e?.message ?? 'Could not save';
		} finally {
			saving = false;
		}
	}

	async function restart() {
		try {
			const result = await restartServer();
			notice = result.supervised
				? 'Stopping. The container will restart the server in a moment.'
				: 'Stopping now. Nothing is supervising this server, so it must be started again by hand.';
		} catch (e: any) {
			error = e?.message ?? 'Could not restart';
		}
	}

	function addLibrary() {
		libraries = [...libraries, { path: '', recursive: true, validation_mode: 'Warn' }];
	}

	function removeLibrary(index: number) {
		libraries = libraries.filter((_, i) => i !== index);
	}

	let section = $derived(schema?.sections.find((s) => s.id === activeSection) ?? null);
</script>

{#if loading}
	<div class="loading-state"><Loader2 size={28} class="spinner" /> <span>Loading settings…</span></div>
{:else if !schema}
	<div class="banner error glass-card">
		<AlertTriangle size={18} />
		{error ?? 'The configuration could not be loaded.'}
	</div>
{:else}
	<div class="config-root">
		{#if readOnly}
			<div class="banner warn glass-card">
				<Lock size={18} />
				<div>
					<strong>These settings are read-only.</strong>
					<p>{schema.runtime.read_only_reason}</p>
				</div>
			</div>
		{/if}

		{#if schema.runtime.bind_error}
			<div class="banner error glass-card">
				<AlertTriangle size={18} />
				<div>
					<strong>The server is not listening where it was asked to.</strong>
					<p>
						Wanted {schema.runtime.desired_addr}, serving on
						{schema.runtime.bound_addr ?? 'nothing'} — {schema.runtime.bind_error}
					</p>
				</div>
			</div>
		{/if}

		<div class="admin-layout">
			<!-- Left Sidebar Nav Categories -->
			<nav class="section-nav glass-card">
				<span class="nav-heading">CATEGORIES</span>
				{#each schema.sections as s (s.id)}
					<button
						class="section-tab {activeSection === s.id ? 'active' : ''}"
						onclick={() => (activeSection = s.id)}
					>
						{s.title}
					</button>
				{/each}
				<button
					class="section-tab {activeSection === 'runtime' ? 'active' : ''}"
					onclick={() => (activeSection = 'runtime')}
				>
					This Server
				</button>
			</nav>

			<!-- Right Settings Pane -->
			<div class="section-body glass-card">
				{#if activeSection === 'runtime'}
					<header>
						<h3>This Server</h3>
						<p>Where this configuration came from and current server runtime state.</p>
					</header>
					<div class="runtime-grid">
						<div class="runtime-item">
							<span class="runtime-label">Config file</span>
							<code class="runtime-val">{schema.runtime.config_path}</code>
						</div>
						<div class="runtime-item">
							<span class="runtime-label">Serving on</span>
							<span class="runtime-val">{schema.runtime.bound_addr || 'not bound'}</span>
						</div>
						<div class="runtime-item">
							<span class="runtime-label">Editable here</span>
							<span class="runtime-val">{schema.runtime.writable ? 'Yes' : 'No'}</span>
						</div>
						<div class="runtime-item">
							<span class="runtime-label">Authentication</span>
							<span class="runtime-val">{schema.runtime.auth_enabled ? 'Required' : 'Not required'}</span>
						</div>
						<div class="runtime-item">
							<span class="runtime-label">Container</span>
							<span class="runtime-val">{schema.runtime.is_docker ? 'Yes' : 'No'}</span>
						</div>
						<div class="runtime-item">
							<span class="runtime-label">Version</span>
							<span class="runtime-val">VuIO {schema.runtime.version}</span>
						</div>
					</div>
				{:else if section}
					<header>
						<h3>{section.title}</h3>
						<p>{section.blurb}</p>
					</header>

					{#if section.directories}
						<div class="libraries">
							{#each libraries as library, index (index)}
								<LibraryCard
									bind:library={libraries[index]}
									defaults={schema.library_defaults}
									disabled={readOnly}
									onremove={() => removeLibrary(index)}
								/>
							{/each}
							{#if libraries.length === 0}
								<p class="muted">No libraries configured.</p>
							{/if}
							<button class="btn btn-secondary" disabled={readOnly} onclick={addLibrary}>
								<Plus size={16} /> Add library
							</button>
						</div>
					{:else}
						{#each section.fields as field (field.key)}
							<ConfigField
								{field}
								bind:value={values[field.key]}
								present={isSet(present, field.key)}
								onpresentchange={(next) => (present[field.key] = next)}
								override={schema.overrides[field.key]}
								disabled={readOnly}
							/>
						{/each}
					{/if}
				{/if}
			</div>
		</div>

		<footer class="config-footer glass-card">
			<div class="footer-info">
				<code>{schema.runtime.config_path}</code>
				<span class="muted">VuIO {schema.runtime.version}</span>
			</div>
			<div class="footer-actions">
				{#if error}<span class="msg error-text">{error}</span>{/if}
				{#if notice}<span class="msg ok-text"><Check size={14} /> {notice}</span>{/if}
				{#if needsRestart}
					<button class="btn btn-secondary" onclick={restart}>
						<RotateCw size={16} /> Restart server
					</button>
				{/if}
				<button class="btn btn-primary" disabled={!dirty || saving || readOnly} onclick={save}>
					{#if saving}
						<Loader2 size={16} class="spinner" /> Saving…
					{:else}
						<Save size={16} /> Save
						{#if dirty}({changedKeys.length + (librariesTouched ? 1 : 0)}){/if}
					{/if}
				</button>
			</div>
		</footer>
	</div>
{/if}

<style>
	.config-root {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.admin-layout {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 20px;
		align-items: start;
	}

	.section-nav {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px;
		position: sticky;
		top: 80px;
	}

	.nav-heading {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.6px;
		padding: 4px 10px 8px 10px;
	}

	.section-tab {
		padding: 10px 14px;
		border-radius: var(--radius-md);
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: var(--transition-smooth);
		width: 100%;
	}

	.section-tab:hover:not(.active) {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-main);
	}

	.section-tab.active {
		color: #ffffff;
		background: var(--accent-cyan);
		box-shadow: 0 4px 14px rgba(0, 164, 220, 0.35);
	}

	.section-body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		min-height: 400px;
	}

	.section-body header {
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-glass);
	}

	.section-body h3 {
		font-size: 1.15rem;
		font-weight: 800;
	}

	.section-body header p {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-top: 3px;
	}

	.runtime-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin-top: 8px;
	}

	.runtime-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: rgba(255, 255, 255, 0.04);
		padding: 12px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-glass);
	}

	.runtime-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.runtime-val {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.libraries {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding-top: 4px;
	}

	.banner {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 18px;
		font-size: 0.85rem;
	}

	.banner p {
		margin-top: 2px;
		color: var(--text-secondary);
	}

	.banner.warn {
		border-left: 3px solid #f59e0b;
	}

	.banner.error {
		border-left: 3px solid #ef4444;
	}

	.config-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 20px;
		flex-wrap: wrap;
		position: sticky;
		bottom: 12px;
	}

	.footer-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.75rem;
	}

	.footer-info code {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.msg {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
	}

	.error-text {
		color: #f87171;
	}

	.ok-text {
		color: #34d399;
	}

	.muted {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 50px;
		color: var(--text-secondary);
	}

	@media (max-width: 800px) {
		.admin-layout {
			grid-template-columns: 1fr;
		}
		.section-nav {
			flex-direction: row;
			overflow-x: auto;
			position: static;
		}
		.nav-heading {
			display: none;
		}
		.section-tab {
			white-space: nowrap;
			text-align: center;
		}
	}
</style>
