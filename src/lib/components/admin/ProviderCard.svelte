<script lang="ts">
	import type { MediaInfoProvider } from '$lib/api/types';
	import { saveCredential } from '$lib/api/client';
	import { Check, ExternalLink, Loader2, KeyRound } from '@lucide/svelte';

	let {
		provider,
		onchange
	}: { provider: MediaInfoProvider; onchange: () => void } = $props();

	// A saved token is never readable back out of the API that set it, so this
	// starts empty and stays empty: what is shown is where the key comes from,
	// never the key. An environment-supplied one is never sent here at all.
	let token = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	async function submit(value: string) {
		busy = true;
		error = null;
		saved = false;
		try {
			await saveCredential(provider.id, value);
			token = '';
			saved = true;
			onchange();
		} catch (e: any) {
			error = e?.message ?? 'Could not save';
		} finally {
			busy = false;
		}
	}

	let sourceLabel = $derived(
		provider.credential_source === 'user'
			? 'Using your saved key'
			: provider.credential_source === 'environment'
				? "Using a key from the server's environment"
				: 'No key — this provider is inactive'
	);
</script>

<div class="provider-item glass-card">
	<div class="provider-info">
		<span class="provider-title">
			{provider.label}
			<span class="provider-group">{provider.group}</span>
		</span>
		<span class="provider-desc">{provider.provides}</span>
	</div>

	<div class="provider-state">
		<span class="badge {provider.enabled ? 'badge-emerald' : 'badge-muted'}">
			{provider.enabled ? 'Enabled' : 'Disabled'}
		</span>
		{#if provider.needs_credential}
			<span class="source source-{provider.credential_source}">
				<KeyRound size={12} />
				{sourceLabel}
			</span>
		{/if}
	</div>

	{#if provider.needs_credential}
		<div class="credential-row">
			<input
				type="password"
				autocomplete="off"
				placeholder={provider.credential_label ?? 'API key'}
				bind:value={token}
				disabled={busy}
				onkeydown={(e) => e.key === 'Enter' && token.trim() && submit(token)}
			/>
			<button
				class="btn btn-primary btn-sm"
				disabled={busy || !token.trim()}
				onclick={() => submit(token)}
			>
				{#if busy}<Loader2 size={14} class="spinner" />{:else}Save{/if}
			</button>
			{#if provider.has_credential}
				<!-- Clearing falls back to the environment rather than turning the
				     provider off, so it is safe to offer without a warning. -->
				<button class="btn btn-secondary btn-sm" disabled={busy} onclick={() => submit('')}>
					Clear
				</button>
			{/if}
		</div>

		<div class="credential-help">
			{#if error}
				<span class="error-text">{error}</span>
			{:else if saved}
				<span class="ok-text"><Check size={13} /> Saved.</span>
			{:else if provider.credential_source === 'environment'}
				Set from <code>{provider.credential_env_var}</code>. Saving a key here overrides it;
				clearing yours falls back to it.
			{:else if provider.credential_source === 'none'}
				Supply one here, or set <code>{provider.credential_env_var}</code> on the server.
			{/if}
			{#if provider.signup_url}
				<a href={provider.signup_url} target="_blank" rel="noreferrer noopener">
					Get a key <ExternalLink size={11} />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.provider-item {
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.provider-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.provider-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.provider-group {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--text-muted);
		letter-spacing: 0.4px;
	}

	.provider-desc {
		font-size: 0.76rem;
		color: var(--text-secondary);
	}

	.provider-state {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.source {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.source-user {
		color: #34d399;
	}

	.source-environment {
		color: var(--accent-cyan);
	}

	.credential-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.credential-row input {
		flex: 1;
		min-width: 0;
		padding: 7px 12px;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-glass);
		color: var(--text-main);
		font-size: 0.82rem;
		font-family: monospace;
		outline: none;
	}

	.credential-row input:focus {
		border-color: var(--accent-cyan);
	}

	.btn-sm {
		padding: 6px 12px;
		font-size: 0.78rem;
	}

	.credential-help {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.credential-help code {
		color: var(--accent-cyan);
		font-size: 0.72rem;
	}

	.credential-help a {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--accent-cyan);
		text-decoration: none;
	}

	.credential-help a:hover {
		text-decoration: underline;
	}

	.error-text {
		color: #f87171;
	}

	.ok-text {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #34d399;
	}

	.badge-muted {
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-muted);
	}
</style>
