<script lang="ts">
	import { mediaStore } from '$lib/stores/mediaStore.svelte';
	import { getMediaStreamUrl } from '$lib/api/client';
	import { X, Download, Image as ImageIcon } from '@lucide/svelte';

	let item = $derived(mediaStore.selectedItem);
	let isImage = $derived(item?.cat === 'image');

	function handleClose() {
		mediaStore.selectItem(null);
	}
</script>

{#if item && isImage}
	<div class="lightbox-backdrop" role="dialog" aria-modal="true">
		<div class="lightbox-content">
			<div class="lightbox-header">
				<div class="lightbox-title-box">
					<ImageIcon size={20} class="text-cyan" />
					<span class="lightbox-title">{item.info_title || item.title || item.name}</span>
					<span class="lightbox-sub">{item.ext.toUpperCase()} • {item.size_str}</span>
				</div>

				<div class="lightbox-actions">
					<a
						href={getMediaStreamUrl(item.id)}
						download={item.name}
						class="btn btn-secondary btn-icon icon-sm"
						title="Download Image"
					>
						<Download size={18} />
					</a>
					<button
						class="btn btn-secondary btn-icon icon-sm"
						onclick={handleClose}
						title="Close"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			<div class="lightbox-body">
				<img src={getMediaStreamUrl(item.id)} alt={item.name} class="lightbox-img" />
			</div>
		</div>
	</div>
{/if}

<style>
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		z-index: 300;
		background: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.lightbox-content {
		position: relative;
		width: 100%;
		height: 100%;
		max-width: 1400px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
	}

	.lightbox-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 20px;
		background: rgba(20, 25, 35, 0.9);
		border-radius: var(--radius-md) var(--radius-md) 0 0;
		border: 1px solid var(--border-glass);
	}

	.lightbox-title-box {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.lightbox-title {
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
	}

	.lightbox-sub {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.lightbox-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lightbox-body {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: #000000;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		border: 1px solid var(--border-glass);
		border-top: none;
		padding: 20px;
	}

	.lightbox-img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: var(--radius-sm);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8);
	}

	.icon-sm {
		width: 34px;
		height: 34px;
	}
</style>
