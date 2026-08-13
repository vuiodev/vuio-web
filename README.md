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

```sh
npm install
npm run dev
```

## Contributing

Contributions are very welcome!

Any contribution intentionally submitted for inclusion in `vuio-web` by you shall be dual licensed under the Apache 2.0 and MIT licenses (input = output license policy), without any additional terms or conditions.

## License

Dual-licensed under either of:

- [Apache License, Version 2.0](LICENSE-APACHE)
- [MIT License](LICENSE-MIT)

at your option.
