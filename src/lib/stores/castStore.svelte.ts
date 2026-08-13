import type { CastRenderer, MediaItem } from '../api/types';
import { fetchRenderers, castMedia, castControl } from '../api/client';

class CastStore {
	renderers = $state<CastRenderer[]>([]);
	activeRenderer = $state<CastRenderer | null>(null);
	isCastModalOpen = $state<boolean>(false);
	targetMedia = $state<MediaItem | null>(null);
	isCasting = $state<boolean>(false);

	async loadRenderers() {
		this.renderers = await fetchRenderers();
	}

	openCastModal(media: MediaItem | null = null) {
		this.targetMedia = media;
		this.isCastModalOpen = true;
		this.loadRenderers();
	}

	closeCastModal() {
		this.isCastModalOpen = false;
	}

	async startCast(renderer: CastRenderer, media: MediaItem) {
		this.activeRenderer = renderer;
		const success = await castMedia(renderer.id, media.id);
		if (success) {
			this.isCasting = true;
			this.isCastModalOpen = false;
		}
		return success;
	}

	async control(action: 'play' | 'pause' | 'stop' | 'seek', position?: number) {
		if (!this.activeRenderer) return;
		await castControl(this.activeRenderer.id, action, position);
		if (action === 'stop') {
			this.isCasting = false;
			this.activeRenderer = null;
		}
	}
}

export const castStore = new CastStore();
