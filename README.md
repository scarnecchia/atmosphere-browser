# Atmosphere Browser

A desktop browser for the AT Protocol atmosphere. Navigate `at://` URIs, view Bluesky profiles and posts, browse any atproto record, and interact with the network.

## Usage

### Navigating

Type any of these into the address bar and press Enter:

- `at://handle.bsky.social` -- view a user's profile and collections
- `handle.bsky.social` -- same thing, `at://` is auto-prefixed
- `at://did:plc:xyz` -- navigate directly by DID
- `at://handle.bsky.social/app.bsky.feed.post` -- browse a collection
- `at://handle.bsky.social/app.bsky.feed.post/rkey` -- view a single record

### Tabs

- Click **+** to open a new tab
- Click a tab to switch to it
- Click **x** on a tab to close it
- Each tab maintains its own navigation history

### Back / Forward

The arrow buttons traverse per-tab history, just like a web browser.

### Bookmarks

- Click the bookmark button in the toolbar to save the current page
- Bookmarks appear as chips below the toolbar
- Click a bookmark chip to navigate to it
- Bookmarks persist across app restarts

### Authentication

1. Click **Login** in the toolbar
2. Enter your handle (e.g. `yourname.bsky.social`)
3. Your system browser opens for AT Protocol OAuth authorization
4. After authorizing, you're returned to the app

Once logged in, posts show interaction buttons:

- **Like** -- creates an `app.bsky.feed.like` record
- **Repost** -- creates an `app.bsky.feed.repost` record
- **Reply** -- opens a text input to compose a reply

Your session persists across app restarts.

### What It Renders

| Collection | Rendering |
|---|---|
| `app.bsky.actor.profile` | Avatar, banner, display name, bio |
| `app.bsky.feed.post` | Rich text with facets (mentions, links, hashtags), image/video embeds, engagement counts |
| `app.bsky.graph.follow` | Subject DID with navigation link |
| `app.bsky.graph.list` | List name, purpose, description |
| `app.bsky.feed.generator` | Feed name, description, creator |
| Everything else | Structured field view with types, or raw JSON with syntax highlighting |

### Engagement Counts

Posts display like, repost, and reply counts via the [Constellation](https://docs.microcosm.blue) backlink index. If Constellation is unavailable, the app shows "counts unavailable" instead of crashing.

### Thread View

When viewing a post that is a reply, the browser assembles the thread by fetching parent posts. Replies to the current post are discovered via Constellation backlinks.

### External Links

Links to `https://` or `http://` URLs open in your system's default browser. AT-URI links navigate within the app.

## Architecture

Three-process Electron app:

- **Main process** (`src/main/`) -- protocol handling, identity resolution, XRPC calls, IPC handlers, auth, persistence
- **Preload** (`src/preload/`) -- secure bridge exposing `window.atBrowser` API via contextBridge
- **Renderer** (`src/renderer/`) -- Lit 3 web components for the browser shell, tiles, and pages

The renderer never makes network calls directly. All I/O goes through the preload bridge to main process IPC handlers.

### Identity Resolution

Handles are resolved in this order:
1. [Slingshot](https://docs.microcosm.blue) (fast edge cache)
2. PLC Directory (authoritative fallback)
3. DNS TXT records (last resort)

### Tile System

Built-in tiles are Lit components routed by collection NSID. Unknown lexicons fall back to a structured schema view or raw JSON.

#### Web Tiles (`ing.dasl.masl`)

Atmosphere Browser supports the [DASL web tiles](https://dasl.ing) lexicon (`ing.dasl.masl`). Web tiles are user-published AT Protocol records that contain an embeddable web application — a tile manifest with a name, description, icon, sizing hints, and bundled resources. When you navigate to an `ing.dasl.masl` record, the browser renders the tile's metadata card and loads the tile content in a sandboxed iframe via the TileMothership runtime.

The Tile Manager (accessible from Settings) lists all installed tiles and allows clearing the tile cache.

## Building

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

This compiles the main, preload, and renderer processes via electron-vite and outputs the result to `out/`. To run the production build locally:

```bash
npm run preview
```

> **Note:** Atmosphere Browser does not currently include an OS packaging step (e.g. `.dmg`, `.exe`, `.AppImage`). The `out/` directory contains the compiled Electron app but not a distributable installer.

## Tech Stack

- Electron 34+
- TypeScript (strict mode)
- Lit 3 (web components)
- electron-vite (build tooling)
- Vitest (testing)
- @atproto/oauth-client-node (authentication)
- @dasl/tiles (tile runtime)
