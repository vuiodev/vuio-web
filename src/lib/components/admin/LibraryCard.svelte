<script lang="ts">
	import type { LibraryEntry } from '$lib/api/types';
	import { Trash2, FolderOpen } from '@lucide/svelte';

	let {
		library = $bindable(),
		defaults,
		disabled = false,
		onremove
	}: {
		library: LibraryEntry;
		/** What a key left unset will actually do, so "None" never lies. */
		defaults: { exclude_patterns: string[] };
		disabled?: boolean;
		onremove: () => void;
	} = $props();

	const VALIDATION_MODES = ['Strict', 'Warn', 'Skip'];

	// Only keys the operator actually set are written back. An omitted key is
	// meaningful — it leaves the root to per-volume auto-detection and to the
	// platform's own exclusions — so filling them in here would freeze this
	// version's defaults into their file.
	let excludeText = $state('');
	let excludeSynced: unknown = $state(undefined);
	$effect(() => {
		if (library.exclude_patterns !== excludeSynced) {
			excludeSynced = library.exclude_patterns;
			excludeText = Array.isArray(library.exclude_patterns)
				? library.exclude_patterns.join('\n')
				: '';
		}
	});

	function commitExclusions(text: string) {
		excludeText = text;
		const items = text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		excludeSynced = items.length > 0 ? items : null;
		library.exclude_patterns = items.length > 0 ? items : null;
	}
</script>

<div class="library-card glass-card">
	<div class="library-head">
		<FolderOpen size={18} class="text-cyan" />
		<input
			type="text"
			class="path-input"
			bind:value={library.path}
			{disabled}
			placeholder="/path/to/media"
		/>
		<button class="btn btn-secondary btn-icon" {disabled} onclick={onremove} title="Remove library">
			<Trash2 size={15} />
		</button>
	</div>

	<div class="library-body">
		<label class="inline">
			<input type="checkbox" bind:checked={library.recursive} {disabled} />
			Scan subdirectories
		</label>

		<label class="inline">
			Missing path
			<select bind:value={library.validation_mode} {disabled}>
				{#each VALIDATION_MODES as mode (mode)}
					<option value={mode}>{mode}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="exclusions">
		<span>Exclude patterns</span>
		<textarea
			rows="3"
			value={excludeText}
			{disabled}
			placeholder={defaults.exclude_patterns.join('\n')}
			oninput={(e) => commitExclusions((e.currentTarget as HTMLTextAreaElement).value)}
		></textarea>
		{#if !library.exclude_patterns || library.exclude_patterns.length === 0}
			<span class="hint">
				Unset — this platform's defaults apply: {defaults.exclude_patterns.join(', ') || 'none'}
			</span>
		{/if}
	</label>
</div>

<style>
	.library-card {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.library-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.path-input {
		flex: 1;
		padding: 9px 14px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.88rem;
		font-family: monospace;
		outline: none;
	}

	.path-input:focus {
		border-color: var(--accent-cyan);
	}

	.library-body {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
	}

	.inline {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.inline select {
		padding: 5px 10px;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.82rem;
		outline: none;
	}

	.exclusions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.exclusions textarea {
		padding: 9px 14px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-family: monospace;
		font-size: 0.8rem;
		resize: vertical;
		outline: none;
	}

	.exclusions textarea:focus {
		border-color: var(--accent-cyan);
	}

	.hint {
		font-style: italic;
	}

	input:disabled,
	select:disabled,
	textarea:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
