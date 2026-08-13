# VuIO Web UI (`vuio-web`)

A modern web interface for the [VuIO](https://github.com/vuio) Rust cross-platform DLNA/UPnP media server, built with **Svelte 5** and **SvelteKit**.

## Features

- **100% Offline & Self-Contained**: Operates without internet connectivity. All dependencies, icons (`@lucide/svelte`), Plyr assets (`plyr.svg`, `plyr.css`, `blank.mp4`), and HLS.js scripts are locally bundled.
- **VuIO Video & Audio Players**:
  - **Video**: Fullscreen modal player wrapping **Plyr** with **HLS.js** for HLS transcode master playlists (`/media/{id}/hls/master.m3u8`), WebVTT subtitle track overlays (`/media/{id}/subtitle.vtt`), speed controls, and unplayable container fallback guards (`avi`, `wmv`, `flv`, `mpg`, `mpeg`).
  - **Audio**: Sticky bottom player bar with HTML5 audio engine, album cover artwork (`/media/{id}/cover`), track details, progress scrubber, volume slider, and playlist queue drawer.
- **Rich MediaInfo & Folder Navigation**:
  - **Main Screen Showcase**: Main screen hero banner displaying cover artwork, series titles, plot synopses (`info_overview`), and an episode/file selector list.
  - **Photo Lightbox**: Direct image preview thumbnails and a fullscreen photo viewer lightbox.
  - **Directory Hierarchy**: Automatic folder grouping and interactive breadcrumb navigation.
- **Remote DLNA / Chromecast Casting**: Discover and control active network renderers (`/api/renderers` and `/api/cast`).
- **Server Administration & Diagnostics**: Real-time system performance metrics dashboard (`/metrics/json`), live log tailing (`/logs`), server configuration manager, and MediaInfo scraper control panel (`/api/admin/mediainfo`).

## Development

This folder is self-contained: it has its own `package.json`, its own toolchain
and its own dev server. Working on the UI needs no Rust, no `cargo` and no
knowledge of the workspace next door.

```sh
npm install
npm run dev
```

That serves the app on <http://localhost:5173> and proxies `/api`, `/media`,
`/metrics`, `/logs`, `/control`, `/login` and `/logout` to a VuIO server on
`127.0.0.1:8080` (see `vite.config.ts`). Any running VuIO instance will do —
your own build, or one already on the network with the proxy retargeted.

This repository is self-contained: no Rust, no `cargo`, and no checkout of the
server needed to work on the interface.

### Getting a change into the server

VuIO ships this app compiled into its binary and serves it on **port 8090**,
beside the older built-in dashboard on 8080. The server lives in a separate
repository, [vuiodev/vuio](https://github.com/vuiodev/vuio), which carries the
built bundle at `crates/vuio-web/dist` — committed, so that building VuIO needs
no Node (its Docker builder stage has none).

So shipping a UI change is two commits, one per repository:

```sh
# 1. here
git commit -am "feat: ..."

# 2. in the server repo, which rebuilds from this checkout
cd ../vuio
./scripts/build-web.sh                 # or: ./scripts/build-web.sh /path/to/vuio-web
git add crates/vuio-web/dist crates/vuio-web/BUILD_INFO.toml
git commit -m "chore(web): rebuild the interface from vuio-web <short-sha>"
```

`BUILD_INFO.toml` records the commit the bundle was built from, so the UI in any
VuIO build traces back to a commit here.

With both repositories checked out side by side, plain `npm run build` also
writes into the server's crate; otherwise it writes a local `build/`. Set
`VUIO_WEB_DIST` for any other layout.

## Contributing

Contributions are very welcome!

Any contribution intentionally submitted for inclusion in `vuio-web` by you shall be dual licensed under the Apache 2.0 and MIT licenses (input = output license policy), without any additional terms or conditions.

## License

Dual-licensed under either of:

- [Apache License, Version 2.0](LICENSE-APACHE)
- [MIT License](LICENSE-MIT)

at your option.
