<script lang="ts">
	import type { ConfigField } from '$lib/api/types';
	import { Info, Lock } from '@lucide/svelte';

	let {
		field,
		value = $bindable(),
		present,
		onpresentchange,
		override,
		disabled = false
	}: {
		field: ConfigField;
		/** The edited value. `null` when the key is unset. */
		value: unknown;
		/** Whether the file sets this key at all. */
		present: boolean;
		/** Reported up rather than bound, so the parent owns the default for a
		 *  key the server said nothing about. */
		onpresentchange: (present: boolean) => void;
		/** A value the command line is forcing for this run, if any. */
		override?: string;
		disabled?: boolean;
	} = $props();

	// A forced key is shown but not editable: saving it would land in the file and
	// then be ignored for the rest of the run, which reads as the edit failing.
	let locked = $derived(disabled || override !== undefined);

	// An unset key still shows the default in force — that is the whole point of
	// the server sending `present` separately from `values`. Editing an unset
	// field sets it, so the toggle flips with the first keystroke.
	function touch() {
		if (!present) onpresentchange(true);
	}

	function setUnset(unset: boolean) {
		onpresentchange(!unset);
		if (unset) value = null;
	}

	let listText = $state('');
	let listSyncedFrom: unknown = $state(undefined);
	$effect(() => {
		// Rebuild the textarea only when the value arrives or is replaced from
		// outside, never on every keystroke, which would fight the cursor.
		if (field.type === 'string_list' && value !== listSyncedFrom) {
			listSyncedFrom = value;
			listText = Array.isArray(value) ? value.join('\n') : '';
		}
	});

	function commitList(text: string) {
		listText = text;
		const items = text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		listSyncedFrom = items;
		value = items;
		touch();
	}

	let numberValue = $derived(typeof value === 'number' ? value : '');
	let textValue = $derived(value === null || value === undefined ? '' : String(value));
</script>

<div class="field" class:unset={!present} class:locked>
	<div class="field-head">
		<label class="field-label" for={`cfg-${field.key}`}>
			{field.label}
			{#if field.impact !== 'live'}
				<span class="badge badge-amber" title="Takes effect after a restart">restart</span>
			{/if}
			{#if override !== undefined}
				<span class="badge badge-muted"><Lock size={11} /> command line</span>
			{/if}
		</label>
		{#if field.removable}
			<label class="unset-toggle">
				<input
					type="checkbox"
					checked={!present}
					disabled={locked}
					onchange={(e) => setUnset((e.currentTarget as HTMLInputElement).checked)}
				/>
				use default
			</label>
		{/if}
	</div>

	<div class="field-input">
		{#if field.type === 'bool'}
			<label class="switch-row">
				<input
					id={`cfg-${field.key}`}
					type="checkbox"
					checked={value === true}
					disabled={locked}
					onchange={(e) => {
						value = (e.currentTarget as HTMLInputElement).checked;
						touch();
					}}
				/>
				<span>{value === true ? 'On' : 'Off'}</span>
			</label>
		{:else if field.type === 'int'}
			<input
				id={`cfg-${field.key}`}
				type="number"
				min={field.min}
				max={field.max}
				value={numberValue}
				disabled={locked}
				oninput={(e) => {
					const raw = (e.currentTarget as HTMLInputElement).value;
					value = raw === '' ? null : Number(raw);
					touch();
				}}
			/>
		{:else if field.type === 'enum'}
			<select
				id={`cfg-${field.key}`}
				value={field.options.includes(textValue) ? textValue : '__custom__'}
				disabled={locked}
				onchange={(e) => {
					const chosen = (e.currentTarget as HTMLSelectElement).value;
					if (chosen !== '__custom__') {
						value = chosen;
						touch();
					}
				}}
			>
				{#each field.options as option (option)}
					<option value={option}>{option}</option>
				{/each}
				{#if field.free_form}
					<option value="__custom__">Something else…</option>
				{/if}
			</select>
			{#if field.free_form && !field.options.includes(textValue)}
				<!-- A named interface, say: the enum lists the common answers but
				     does not exhaust them. -->
				<input
					type="text"
					value={textValue}
					disabled={locked}
					placeholder="Custom value"
					oninput={(e) => {
						value = (e.currentTarget as HTMLInputElement).value;
						touch();
					}}
				/>
			{/if}
		{:else if field.type === 'string_list'}
			<textarea
				id={`cfg-${field.key}`}
				rows="4"
				value={listText}
				disabled={locked}
				placeholder="One per line"
				oninput={(e) => commitList((e.currentTarget as HTMLTextAreaElement).value)}
			></textarea>
		{:else}
			<input
				id={`cfg-${field.key}`}
				type="text"
				value={textValue}
				disabled={locked}
				placeholder={field.type === 'path' ? '/path/to/somewhere' : ''}
				oninput={(e) => {
					const raw = (e.currentTarget as HTMLInputElement).value;
					value = raw === '' && field.removable ? null : raw;
					touch();
				}}
			/>
		{/if}
	</div>

	<p class="field-help">
		{field.help}
		{#if !present}
			<span class="field-default">Not set — showing the default in force.</span>
		{/if}
	</p>
	{#if override !== undefined}
		<p class="field-note">
			The command line is forcing <code>{override}</code> for this run. A change saved here goes
			into the file but will not take effect until the server is started without it.
		</p>
	{/if}
	{#if field.note}
		<p class="field-note"><Info size={13} /> {field.note}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 0;
		border-bottom: 1px solid var(--border-glass);
	}

	.field:last-child {
		border-bottom: none;
	}

	.field-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.unset-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		color: var(--text-muted);
		cursor: pointer;
	}

	.field-input {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.field-input input[type='text'],
	.field-input input[type='number'],
	.field-input select,
	.field-input textarea {
		flex: 1;
		min-width: 200px;
		padding: 9px 14px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.88rem;
		font-family: inherit;
		outline: none;
	}

	.field-input textarea {
		resize: vertical;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.field-input input:focus,
	.field-input select:focus,
	.field-input textarea:focus {
		border-color: var(--accent-cyan);
	}

	.field-input input:disabled,
	.field-input select:disabled,
	.field-input textarea:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.switch-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.88rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.field.unset .field-input input,
	.field.unset .field-input select,
	.field.unset .field-input textarea {
		opacity: 0.6;
	}

	.field-help {
		font-size: 0.78rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.field-default {
		color: var(--text-muted);
		font-style: italic;
	}

	.field-note {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
	}

	.field-note code {
		color: var(--accent-cyan);
	}

	.badge-amber {
		background: rgba(245, 158, 11, 0.18);
		color: #fbbf24;
	}

	.badge-muted {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-muted);
	}
</style>
