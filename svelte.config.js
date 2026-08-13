import { existsSync, readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// This app is its own repository. The server that ships it is a separate one
// (github.com/vuiodev/vuio), which carries the built bundle at
// `crates/vuio-web/dist` and compiles it into the `vuio` binary — so building
// VuIO needs no Node, and working on this app needs no Rust.
//
// With both checked out side by side, the build writes straight into the
// server's crate, so there is no copy step for the shipped UI to fall behind.
// `VUIO_WEB_DIST` overrides that for any other layout, and with neither, the
// build simply lands in a local `build/`.
const SIBLING = '../vuio/crates/vuio-web/dist';
const DIST =
	process.env.VUIO_WEB_DIST ??
	(existsSync(new URL('../vuio/crates/vuio-web', import.meta.url)) ? SIBLING : 'build');

// SvelteKit's default app version is `Date.now()`. That makes every build
// differ from the last one even when nothing changed: the timestamp lands in
// `version.json` and in the `__sveltekit_<hash>` global, and from there into
// the content hash of four bundles. Since the bundle is committed to the server
// repository, a clock-derived version would show up as a diff on every build
// and make it impossible to tell a real UI change from a rebuild.
//
// The package version instead: stable for a given source tree, and changing it
// is a deliberate act. It costs nothing — SvelteKit only uses this to tell an
// open tab that a new build has been deployed, and bundle URLs are content
// hashed regardless.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: DIST,
			assets: DIST,
			fallback: 'index.html',
			precompress: false,
			strict: false
		}),
		version: {
			name: version
		}
	}
};

export default config;
