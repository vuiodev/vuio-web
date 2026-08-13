import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/media': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/metrics': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/logs': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/control': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/login': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			},
			'/logout': {
				target: 'http://127.0.0.1:8080',
				changeOrigin: true
			}
		}
	}
});
