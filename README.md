# Atmosphere Browser

A desktop browser for the AT Protocol atmosphere. Navigate `at://` URIs, browse any repo or record, and like, repost, or reply to Bluesky posts.

```bash
npm install
npm run dev
```

## Usage

### Navigating

Type any of these into the address bar and press Enter:

- `at://handle.bsky.social` — view a user's profile and collections
- `handle.bsky.social` — same thing, `at://` is auto-prefixed
- `at://did:plc:xyz` — navigate directly by DID
- `at://handle.bsky.social/app.bsky.feed.post` — browse a collection
- `at://handle.bsky.social/app.bsky.feed.post/rkey` — view a single record

### Tabs

- Click **+** to open a new tab
- Click a tab to switch to it
- Click **x** on a tab to close it
- Each tab maintains its own navigation history

### Back / forward

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

- **Like** — creates an `app.bsky.feed.like` record
- **Repost** — creates an `app.bsky.feed.repost` record
- **Reply** — opens a text input to compose a reply

Your session persists across app restarts.

### What it renders

| Collection | Rendering |
|---|---|
| `app.bsky.actor.profile` | Avatar, banner, display name, bio |
| `app.bsky.feed.post` | Rich text with facets (mentions, links, hashtags), image/video embeds, engagement counts |
| `app.bsky.graph.follow` | Subject DID with navigation link |
| `app.bsky.graph.list` | List name, purpose, description |
| `app.bsky.feed.generator` | Feed name, description, creator |
| Everything else | Structured field view with types, or raw JSON with syntax highlighting |

### Engagement counts

Posts display like, repost, and reply counts from the [Constellation](https://docs.microcosm.blue) backlink index. If Constellation is unavailable, the app shows "counts unavailable" instead of crashing.

### Thread view

When viewing a reply, the browser assembles the thread by fetching parent posts. Replies to the viewed post are discovered via Constellation backlinks.

### External links

`https://` and `http://` URLs open in your system's default browser. AT-URI links navigate within the app.

## Architecture

Three-process Electron app:

- **Main process** (`src/main/`) — protocol handling, identity resolution, XRPC calls, IPC handlers, auth, persistence
- **Preload** (`src/preload/`) — secure bridge exposing `window.atBrowser` API via contextBridge
- **Renderer** (`src/renderer/`) — Lit 3 web components for the browser shell, tiles, and pages

The renderer never makes network calls directly. All I/O goes through the preload bridge to main process IPC handlers.

### Identity resolution

Handles are resolved in this order:
1. [Slingshot](https://docs.microcosm.blue) (fast edge cache)
2. PLC Directory (authoritative fallback)
3. DNS TXT records (last resort)

### Tile system

Built-in tiles are Lit components routed by collection NSID. Unknown lexicons fall back to a structured schema view or raw JSON.

#### Web tiles (`ing.dasl.masl`)

The browser supports [DASL web tiles](https://dasl.ing) — AT Protocol records (`ing.dasl.masl`) that bundle an embeddable web application with a manifest (name, description, icon, sizing hints, and resources). When you navigate to one, the browser renders the tile's metadata card and loads its content in a sandboxed iframe via the TileMothership runtime.

The Tile Manager (accessible from Settings) lists installed tiles and lets you clear the tile cache.

## Building

```bash
npm run dev          # development with hot reload
npm run build        # production build to out/
npm run preview      # run the production build locally
npm run typecheck    # type checking
npm run lint         # eslint
npm test             # vitest
```

### Packaging

```bash
npm run dist         # build for all platforms (mac + win + linux)
npm run dist:mac     # macOS only (DMG + zip)
npm run dist:win     # Windows only (NSIS installer + portable)
npm run dist:linux   # Linux only (AppImage + deb)
```

Distributables are output to `dist/`. Cross-compilation from macOS works for most targets, but Windows/Linux code signing requires native CI environments.

## Tech stack

- Electron 34+
- TypeScript (strict mode)
- Lit 3 (web components)
- electron-vite (build tooling)
- Vitest (testing)
- @atproto/oauth-client-node (authentication)
- @dasl/tiles (tile runtime)
