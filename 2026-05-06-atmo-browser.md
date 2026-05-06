# Atmosphere Browser Design

## Summary

Atmosphere Browser is a standalone Electron desktop application that brings a browser-like experience to the AT Protocol. Instead of HTTP and HTML pages, it resolves `at://` URIs — navigating through DID documents, PDS endpoints, and XRPC calls — and presents the resulting structured records as human-readable pages. The goal is to make the protocol legible to anyone without exposing its internals: a post looks like a post, a profile looks like a profile, a follow list looks like a follow list.

The rendering system is built on DASL Tiles — sandboxed, content-addressed micro-apps that receive record data via a typed context API and produce the visible page. Built-in tiles cover the core Bluesky lexicons for MVP; unknown record types fall back to an auto-generated structured view derived from the record's lexicon schema. The application is layered into three concerns: a protocol layer (Electron main process) that owns all AT Protocol communication, a shell layer (Lit/Web Components) that provides browser chrome (address bar, tabs, bookmarks, auth), and the tile rendering layer that handles all content display. Supporting services — Constellation for engagement counts, Slingshot for identity caching, UFOs for lexicon discovery — are treated as optional enrichment rather than hard dependencies.

## Definition of Done

A downloadable Electron desktop application ("Atmosphere Browser") that lets anyone browse AT Protocol data by navigating to `at://` URIs, rendering repos and records as human-readable semantic web pages without exposing the underlying protocol.

### Success Criteria

- Navigating to `at://handle` shows that account's repo rendered semantically — posts look like posts, profiles look like profiles, follows are a readable list
- app.bsky.* lexicons have purpose-built rendering (the MVP lexicon set)
- Unknown lexicons fall back to auto-generated structured views derived from their schema via resolveLexicon
- Engagement counts (likes, reposts, replies) display via Constellation
- Blobs (images, video) render inline via com.atproto.sync.getBlob
- Users can log in via AT Protocol OAuth (loopback pattern) and perform basic interactions (like, repost, reply)
- AT-URI links within records navigate within the browser; external URLs open in system browser
- Feed generator URIs are bookmarkable and browsable as first-class AT-URIs
- Single-account auth with session persistence

### Out of Scope

- https:// browsing — this is purely an atmosphere browser
- Inline feed/timeline rendering — feeds are browsable as AT-URIs, not consumed as timelines
- Multi-account support
- Custom rendering plugin authoring/distribution workflow (plugin architecture is designed, community contribution mechanism is deferred)
- Rendering hints-in-lexicon standardisation conversation

## Acceptance Criteria

### atmo-browser.AC1: Semantic rendering of app.bsky.* records
- **atmo-browser.AC1.1 Success:** Navigating to `at://handle` displays profile tile with avatar, display name, and bio
- **atmo-browser.AC1.2 Success:** Post records render with rich text, resolved facets (mentions as links, URLs as clickable links, hashtags)
- **atmo-browser.AC1.3 Success:** Follow records render as a readable list with handle and display name per entry
- **atmo-browser.AC1.4 Failure:** Navigating to a non-existent handle shows a clear error page, not a crash or blank screen
- **atmo-browser.AC1.5 Edge:** Records with empty or minimal fields (no avatar, no bio) render gracefully with placeholders

### atmo-browser.AC2: Tile rendering system
- **atmo-browser.AC2.1 Success:** Built-in tiles load from pre-cached local storage without network requests
- **atmo-browser.AC2.2 Success:** Tile sandbox prevents network access beyond manifest-declared resources
- **atmo-browser.AC2.3 Success:** Tile context API delivers record, lexicon, engagement, and identity data to tiles
- **atmo-browser.AC2.4 Failure:** A malformed tile manifest fails to load with an error message rather than crashing the browser
- **atmo-browser.AC2.5 Edge:** Tile that throws a runtime error is caught; browser shows fallback rather than blank content

### atmo-browser.AC3: Navigation
- **atmo-browser.AC3.1 Success:** Typing `at://handle.bsky.social` in address bar resolves and navigates to repo page
- **atmo-browser.AC3.2 Success:** Typing bare handle (no `at://` prefix) auto-prefixes and resolves
- **atmo-browser.AC3.3 Success:** Back/forward buttons traverse per-tab history
- **atmo-browser.AC3.4 Success:** Clicking an AT-URI link in a tile navigates within the browser
- **atmo-browser.AC3.5 Success:** Multiple tabs maintain independent navigation state
- **atmo-browser.AC3.6 Failure:** Navigating to an unresolvable handle shows error, address bar retains input for correction
- **atmo-browser.AC3.7 Edge:** Navigating to `at://did:plc:xyz` directly (without handle) resolves via PLC

### atmo-browser.AC4: Blob handling
- **atmo-browser.AC4.1 Success:** Images referenced by CID in post embeds render inline
- **atmo-browser.AC4.2 Success:** Video blobs render with a playable video element
- **atmo-browser.AC4.3 Failure:** Missing or unreachable blob shows placeholder image, not broken element
- **atmo-browser.AC4.4 Edge:** Large blobs (>10MB) load progressively without blocking page rendering

### atmo-browser.AC5: Engagement via Constellation
- **atmo-browser.AC5.1 Success:** Posts display like, repost, and reply counts
- **atmo-browser.AC5.2 Success:** Thread view discovers replies via Constellation backlinks
- **atmo-browser.AC5.3 Failure:** Constellation unavailability shows "counts unavailable" rather than crash or zero
- **atmo-browser.AC5.4 Edge:** Records with zero engagement show counts as 0, not absent

### atmo-browser.AC6: Authentication
- **atmo-browser.AC6.1 Success:** OAuth loopback flow completes — user clicks login, system browser opens, authorization returns to app
- **atmo-browser.AC6.2 Success:** Session persists across app restart via stored refresh token
- **atmo-browser.AC6.3 Success:** Logged-in state shows current handle in account widget
- **atmo-browser.AC6.4 Failure:** OAuth flow interrupted (user closes browser tab) returns to logged-out state gracefully
- **atmo-browser.AC6.5 Failure:** Expired token triggers automatic refresh without user intervention

### atmo-browser.AC7: Write actions
- **atmo-browser.AC7.1 Success:** Authenticated user can like a post (creates `app.bsky.feed.like` record)
- **atmo-browser.AC7.2 Success:** Authenticated user can repost (creates `app.bsky.feed.repost` record)
- **atmo-browser.AC7.3 Success:** Authenticated user can reply to a post (creates `app.bsky.feed.post` with reply ref)
- **atmo-browser.AC7.4 Failure:** Write actions hidden/disabled when not authenticated
- **atmo-browser.AC7.5 Failure:** Write failure (network error, auth expired) shows error message, does not corrupt local state

### atmo-browser.AC8: Bookmarks and feeds
- **atmo-browser.AC8.1 Success:** User can bookmark any AT-URI
- **atmo-browser.AC8.2 Success:** Feed generator AT-URIs are bookmarkable and navigable
- **atmo-browser.AC8.3 Success:** Bookmarks persist across app restart
- **atmo-browser.AC8.4 Edge:** Bookmarked URI that no longer resolves shows "unavailable" indicator

### atmo-browser.AC9: Unknown lexicon fallback
- **atmo-browser.AC9.1 Success:** Records with unknown lexicon NSID render as auto-generated structured view from resolved schema
- **atmo-browser.AC9.2 Success:** Schema fallback shows field names, types, and values in human-readable format
- **atmo-browser.AC9.3 Failure:** Unresolvable lexicon schema falls back to raw JSON display with syntax highlighting
- **atmo-browser.AC9.4 Edge:** Record with deeply nested objects renders with collapsible sections

## Glossary

- **AT Protocol (atproto)**: The open, federated social networking protocol underlying Bluesky. Defines how identity, data, and communication work across the network.
- **AT-URI (`at://`)**: The URI scheme for addressing resources in the AT Protocol. Takes the form `at://handle-or-did/collection.nsid/record-key`.
- **DID (Decentralized Identifier)**: A persistent, globally unique identifier for an account. Two forms used here: `did:plc:...` (PLC directory-managed) and `did:web:...` (DNS-based).
- **PDS (Personal Data Server)**: The server that hosts a user's repository. Exposes an XRPC API for reading and writing records.
- **XRPC**: The HTTP-based RPC protocol AT Protocol uses for PDS communication. Methods are namespaced by NSID.
- **NSID (Namespaced Identifier)**: A reverse-DNS string (e.g. `app.bsky.feed.post`) that identifies a lexicon, record collection, or XRPC method.
- **Lexicon**: The schema definition language for AT Protocol record types and XRPC methods. Each NSID has a corresponding lexicon document describing its fields and types.
- **PLC Directory**: The `plc.directory` service that maps `did:plc` identifiers to DID documents, including PDS endpoint discovery.
- **DID Document**: The authoritative document for a DID, containing service endpoints (including the user's PDS) and verification keys.
- **Repo**: The collection of signed records owned by a single DID, hosted on their PDS. Analogous to a user's account data store.
- **CID (Content Identifier)**: A content-addressed hash used to reference blobs and records immutably within the AT Protocol.
- **CARball**: A CAR (Content Addressable aRchive) file — a binary bundle format for packaging content-addressed data. Used here for distributing DASL tile bundles.
- **DASL Tiles**: A sandboxed web micro-app format for rendering AT Protocol records. Each tile is a self-contained renderer for a specific lexicon type, distributed as a CARball with a MASL manifest.
- **MASL Manifest**: The metadata manifest bundled with a DASL tile, declaring its capabilities, network access permissions, and entry points.
- **TileMothership**: The top-level configuration object from `@dasl/tiles` that manages tile loaders and the tile runtime environment.
- **Constellation**: A community-operated backlink index service for the AT Protocol. Provides engagement counts and reply discovery for any AT-URI.
- **Slingshot**: A community-operated identity cache service. Provides fast handle-DID resolution via a `resolveMiniDoc` endpoint, reducing load on the PLC directory.
- **UFOs**: A community-operated lexicon statistics service. Tracks what collection NSIDs exist in the network; used for discovering unknown record types.
- **Facets**: Structured annotations on AT Protocol rich text that mark up spans as mentions, links, or hashtags. Must be resolved to render post text correctly.
- **OAuth loopback pattern**: An OAuth 2.0 flow where the desktop app spawns a local HTTP listener to receive the authorization code, avoiding the need for a registered redirect URI.
- **CSP (Content Security Policy)**: HTTP headers that constrain what resources a web page can load or execute. Used in the tile sandbox to block unauthorized network access.
- **rkey (Record Key)**: The final segment of an AT-URI, uniquely identifying a record within a collection for a given repo.
- **Feed generator**: An AT Protocol service that implements the `app.bsky.feed.generator` lexicon, serving custom feeds as AT-URIs.
- **AuthChannel**: The write-capable interface passed to authenticated tiles, exposing `createRecord` and `deleteRecord` operations scoped to the logged-in user.
- **Microcosm services**: The collective name for community-operated infrastructure services: Constellation, Slingshot, and UFOs. Hosted at microcosm.blue.
- **Lit / Web Components**: Lit is a lightweight library for building Web Components — the standard browser API for custom, encapsulated HTML elements. Used for the browser shell UI.

## Architecture

Three-layer architecture separating protocol concerns, browser chrome, and content rendering.

### Protocol Layer (Electron Main Process)

Handles all AT Protocol communication and URI resolution. Runs in the Electron main process with full network access.

**URI Resolution Chain:**
1. Parse `at://` URI from address bar input
2. If hostname is a handle: DNS TXT lookup for `_atproto.{handle}` → DID
3. If DID: query PLC directory (`plc.directory`) → DID document
4. Extract PDS endpoint from DID document `#atproto_pds` service entry
5. XRPC calls to PDS for record data

**PDS Communication (XRPC):**
- `com.atproto.repo.describeRepo` — repo metadata and available collections
- `com.atproto.repo.listRecords` — paginated record listing per collection (limit 1-100, cursor-based)
- `com.atproto.repo.getRecord` — single record by repo + collection + rkey
- `com.atproto.sync.getBlob` — binary blob fetch by CID (images, video)
- `com.atproto.repo.createRecord` / `deleteRecord` — write operations (authenticated)

**Microcosm Service Clients:**
- **Constellation** — backlink index. Query engagement counts (likes, reposts, replies) and resolve thread participants for any AT-URI
- **Slingshot** — identity cache. Fast handle↔DID resolution with `resolveMiniDoc` endpoint, avoiding repeated PLC lookups
- **UFOs** — lexicon statistics. Discover what collection NSIDs exist in the network, sample records for unknown lexicons

**Lexicon Resolution:**
- `com.atproto.lexicon.resolveLexicon` — fetch schema for any NSID at runtime
- Used by the schema fallback renderer to auto-generate structured views of unknown record types

**OAuth Session Management:**
- Loopback pattern: spawn local HTTP listener on `127.0.0.1:{random_port}/callback`
- Open system browser to PDS authorization endpoint
- Receive authorization code at loopback callback
- Exchange for access/refresh tokens
- Persist session locally with automatic token refresh
- Single broad `atproto` scope (granular scopes not yet available in protocol)

**Tile Cache:**
- Local storage of resolved DASL tile bundles
- Built-in tiles pre-cached at install time
- Community tiles cached after first load from PDS

### Shell Layer (Electron Renderer — Lit/Web Components)

Browser chrome built with Lit (web components). Manages navigation, tabs, bookmarks, and account state. Communicates with protocol layer via Electron IPC.

**Components:**
- **Address bar** — accepts `at://` URIs and bare handles (auto-prefixed). Shows resolved handle + DID on navigation
- **Tab bar** — multiple `at://` pages open simultaneously. Each tab maintains its own navigation history
- **Navigation controls** — back/forward/reload. History stack per tab
- **Bookmark bar** — stores AT-URIs including feed generator URIs as first-class items
- **Account widget** — login/logout, shows current handle when authenticated
- **Settings page** — tile management, cache, display preferences
- **Tile manager** — view installed renderers, browse/install community tiles

**IPC Pattern:**
Shell ↔ Protocol Layer communication via Electron `ipcRenderer`/`ipcMain`. Protocol layer exposes an API surface for:
- URI resolution requests
- Record fetching
- Blob retrieval
- Auth state queries
- Tile loading

This mirrors Beaker's `pauls-electron-rpc` manifest pattern (`app/bg/rpc-manifests/views.js`) where methods are declared as `'promise'` (request-response) or `'readable'` (event streams), but uses modern Electron IPC directly rather than a third-party library.

### Rendering Layer (DASL Tiles)

All content rendering — including built-in app.bsky.* views — happens via DASL Tiles. Tiles are sandboxed, content-addressed, network-isolated web micro-apps distributed as CARballs with MASL manifests.

**Tile Runtime:**
- Uses `@dasl/tiles` package — `TileMothership` for configuration, `loadTile()` for instantiation
- Tile loaders: `ATTileLoader` (fetch from PDS), `CARTileLoader` (local cache), `MemoryTileLoader` (built-in tiles)
- Rendering: `tile.renderCard()` for compact views, `tile.renderContent()` for full views

**Sandbox Model:**
- CSP headers block all network access beyond manifest-declared resources
- `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups` sandbox directives
- Cross-origin policies (CORP, COOP) prevent data exfiltration
- Each tile gets a unique origin

**Tile Context API (data passed from browser to tile):**

```typescript
interface TileContext {
  record: unknown;
  lexicon: LexiconSchema;
  engagement: EngagementData;
  identity: IdentityInfo;
  auth?: AuthChannel;
  navigate: (atUri: string) => void;
}

interface EngagementData {
  likes: number;
  reposts: number;
  replies: number;
  backlinks: BacklinkEntry[];
}

interface IdentityInfo {
  did: string;
  handle: string;
  pds: string;
}

interface AuthChannel {
  did: string;
  handle: string;
  createRecord: (collection: string, record: unknown) => Promise<{ uri: string; cid: string }>;
  deleteRecord: (collection: string, rkey: string) => Promise<void>;
}
```

**Tile Resolution Order:**
1. Built-in tile for NSID? → load from pre-cached local storage
2. User-installed community tile for NSID? → load from tile cache
3. Neither? → load schema fallback renderer tile, pass resolved lexicon schema

**Built-in Tiles (MVP):**
- `app.bsky.actor.profile` — profile display (avatar, banner, bio, stats)
- `app.bsky.feed.post` — post rendering (rich text with facets, embeds, engagement counts)
- `app.bsky.feed.threadgate` — thread view assembly
- `app.bsky.graph.follow` — follow list display
- `app.bsky.graph.list` — list display
- Schema fallback renderer — auto-generates structured view from any lexicon schema

**Thread Assembly:**
- Posts contain `reply.parent` and `reply.root` AT-URI refs
- Constellation backlinks provide "who replied to this post"
- Browser (protocol layer) assembles thread structure by walking refs
- Thread tile receives assembled thread data, not individual posts

**Blob Handling:**
- Record fields reference blobs by CID (`ref.$link`)
- Protocol layer fetches via `com.atproto.sync.getBlob` from record owner's PDS
- Passes blob data (or blob URL) to tile context
- Tiles render inline: images as `<img>`, video with player element

### Navigation Model

**Address bar input:**
- `at://handle.bsky.social` → resolves and navigates
- `handle.bsky.social` → auto-prefixes `at://`, resolves and navigates
- `at://did:plc:xyz` → resolves DID directly
- `at://handle/app.bsky.feed.post/rkey` → navigates to specific record

**Page types:**
- **Repo page** (`at://handle`): lists collections in the repo. Each collection shown as a section with record count. Profile tile rendered at top if `app.bsky.actor.profile` exists
- **Collection page** (`at://handle/collection.nsid`): paginated list of records in that collection, each rendered by the appropriate tile
- **Record page** (`at://handle/collection.nsid/rkey`): single record rendered by its tile in full view. For posts, thread assembly kicks in

**Link handling:**
- AT-URI links in tile content → navigate within browser (new page in current tab or new tab)
- External URLs (https://, http://) → open in system default browser via `shell.openExternal()`
- Facet links in post text → resolved by post tile, dispatched appropriately

**History:**
- Per-tab navigation stack (back/forward)
- Global history log (searchable, clearable)
- Bookmarks stored locally, synced to nowhere (MVP)

## Existing Patterns

Beaker Browser (`/Users/scarndp/dev/bluesky/beaker`) provides reference patterns for several core subsystems. This is a greenfield project — we reference Beaker's design decisions, not its code.

**Protocol handler registration:** Beaker registers `hyper://`, `dat://`, `beaker://` via `protocol.registerSchemesAsPrivileged()` before app ready, then `protocol.registerStreamProtocol()` after (`app/main.js:73-77`, `app/bg/protocols/hyper.js:91`). Handler signature: `async function(request, respond)` where response includes `{statusCode, headers, data}`. We follow the same pattern for `at://` registration.

**Process separation:** Beaker separates background (main process, `app/bg/`) from foreground (renderer, `app/fg/`) with RPC manifests declaring methods as `'promise'` or `'readable'` (`app/bg/rpc-manifests/views.js`). We adopt this separation but use Electron's built-in IPC rather than `pauls-electron-rpc`.

**Shell as web components:** Beaker's shell uses LitElement v2.0.1 (vendored at `app/fg/vendor/lit-element/`). Components: `<shell-window-ui>`, `<shell-window-tabs>`, navbar, panes (`app/fg/shell-window/`). We use modern Lit (v3+) with the same component architecture.

**Tab data model:** Beaker's `Tab` class (`app/bg/ui/tabs/manager.js:46`) maintains `id`, `panes[]`, `url`, `title`, `isActive`, `isPinned` with pane-based split views. We adopt a simplified version without panes for MVP.

**Permission model:** Beaker uses `session.defaultSession.setPermissionRequestHandler()` with queued requests and modal subwindow prompts (`app/bg/ui/permissions.js:21-169`). We adopt a similar pattern for tile capability requests.

**Divergence from Beaker:**
- Beaker uses custom `pauls-electron-rpc` → we use Electron IPC directly
- Beaker uses LitElement 2.0.1 (vendored) → we use Lit 3+ (npm)
- Beaker renders HTML/files from drives → we render structured records via DASL tiles
- Beaker manages a local daemon (hyperdrive) → we make HTTP requests to PDSes and Microcosm services

## Implementation Phases

<!-- START_PHASE_1 -->
### Phase 1: Project Scaffold and Protocol Layer

**Goal:** Electron app that resolves `at://` URIs and fetches records from PDSes.

**Components:**
- Electron app scaffold with TypeScript, Lit dependencies, build tooling
- `at://` protocol handler registration with Electron
- DID/handle resolution module (DNS TXT → PLC directory → DID document → PDS endpoint)
- XRPC client for PDS communication (describeRepo, listRecords, getRecord, getBlob)
- Slingshot client for cached identity resolution

**Dependencies:** None (first phase)

**Done when:** App launches, typing an `at://` URI resolves to a DID, fetches repo metadata, and logs record data to console. Slingshot resolves handles. Build succeeds.
<!-- END_PHASE_1 -->

<!-- START_PHASE_2 -->
### Phase 2: Browser Shell

**Goal:** Functional browser chrome with address bar, tabs, and navigation.

**Components:**
- Lit-based shell window with address bar, tab bar, navigation controls
- IPC bridge between shell (renderer) and protocol layer (main process)
- Tab manager — create/close/switch tabs, per-tab navigation history
- Basic page rendering area (placeholder content from protocol layer)
- Back/forward/reload controls wired to tab history

**Dependencies:** Phase 1 (protocol layer provides data to display)

**Done when:** User can type `at://handle` in address bar, see resolved repo metadata rendered in a basic view, open multiple tabs, navigate back/forward. Covers `atmo-browser.AC3.*` (navigation).
<!-- END_PHASE_2 -->

<!-- START_PHASE_3 -->
### Phase 3: Tile Runtime

**Goal:** DASL tile loading, sandboxing, and context API working in the browser.

**Components:**
- Tile runtime integration using `@dasl/tiles` (`TileMothership`, `loadTile()`)
- Tile loader configuration (CARTileLoader for local, ATTileLoader for remote)
- Tile context API implementation — bridge between protocol layer data and tile sandbox
- Tile rendering area in shell — `renderCard()` and `renderContent()` modes
- Schema fallback renderer tile — auto-generates structured view from lexicon schema

**Dependencies:** Phase 2 (shell provides rendering area and IPC bridge)

**Done when:** A tile can be loaded, receives record data via context API, and renders in the browser. Schema fallback renderer displays any record type as structured fields. Covers `atmo-browser.AC2.*` (tile rendering).
<!-- END_PHASE_3 -->

<!-- START_PHASE_4 -->
### Phase 4: Built-in Tiles for app.bsky.*

**Goal:** Purpose-built tiles for core Bluesky lexicons that make browsing feel like a real product.

**Components:**
- `app.bsky.actor.profile` tile — avatar, banner, display name, bio, follower/following counts
- `app.bsky.feed.post` tile — rich text rendering with facet resolution (mentions, links, hashtags), embed rendering (images, external links, quote posts, video)
- `app.bsky.graph.follow` tile — follow list with identity display
- `app.bsky.graph.list` tile — list display with member listing
- Thread view tile — assembled thread display using reply parent/root refs
- Repo page layout — collection listing with record counts, profile tile at top

**Dependencies:** Phase 3 (tile runtime provides loading and context API)

**Done when:** Navigating to `at://handle.bsky.social` shows a profile page with posts, images render inline, clicking a post shows thread view. Covers `atmo-browser.AC1.*` (semantic rendering) and `atmo-browser.AC4.*` (blob handling).
<!-- END_PHASE_4 -->

<!-- START_PHASE_5 -->
### Phase 5: Engagement Integration

**Goal:** Engagement counts and backlinks display alongside records.

**Components:**
- Constellation client module in protocol layer
- Engagement data fetching — query Constellation for like/repost/reply counts per AT-URI
- Backlink resolution — fetch reply backlinks for thread assembly
- Tile context enrichment — pass engagement data to tiles via `TileContext.engagement`
- Post tile update — display like/repost/reply counts
- Thread tile update — use Constellation backlinks for reply discovery

**Dependencies:** Phase 4 (tiles exist to display engagement data)

**Done when:** Posts show like/repost/reply counts. Thread view discovers replies via Constellation. Covers `atmo-browser.AC5.*` (engagement).
<!-- END_PHASE_5 -->

<!-- START_PHASE_6 -->
### Phase 6: Authentication and Write Actions

**Goal:** Users can log in and perform basic interactions (like, repost, reply).

**Components:**
- OAuth module — loopback listener, authorization flow, token management, session persistence
- Auth state in shell — account widget showing login status, login/logout UI
- AuthChannel implementation — write operations (createRecord, deleteRecord) exposed to tiles
- Post tile update — like/repost/reply buttons when authenticated
- IPC auth bridge — secure token handling between main and renderer processes

**Dependencies:** Phase 5 (engagement counts inform which interactions are available)

**Done when:** User can log in via OAuth, like a post, repost a post, write a reply. Session persists across app restart. Covers `atmo-browser.AC6.*` (auth) and `atmo-browser.AC7.*` (write actions).
<!-- END_PHASE_6 -->

<!-- START_PHASE_7 -->
### Phase 7: Bookmarks, Settings, and Polish

**Goal:** Complete browser experience with bookmarks, settings, tile management, and feed browsing.

**Components:**
- Bookmark manager — save/remove/organize AT-URI bookmarks including feed generator URIs
- Bookmark bar in shell UI
- Settings page (Lit component) — cache management, display preferences
- Tile manager page — view installed tiles, browse/install community tiles from AT Protocol
- Feed URI browsing — navigate to feed generator AT-URIs, render feed output
- History page — searchable browsing history
- External link handling — `shell.openExternal()` for non-AT-URI links

**Dependencies:** Phase 6 (auth needed for tile installation from PDS)

**Done when:** Bookmarks persist, feed URIs are browsable, settings page works, tile manager can list and install community tiles. Covers `atmo-browser.AC8.*` (bookmarks/feeds) and `atmo-browser.AC9.*` (unknown lexicons via tile manager).
<!-- END_PHASE_7 -->

## Additional Considerations

**Microcosm service availability:** Constellation, Slingshot, and UFOs are community-operated services. The browser should handle service unavailability gracefully — engagement counts show "unavailable" rather than crashing, identity resolution falls back to direct PLC lookup if Slingshot is down. No custom appview as fallback — degraded mode with direct PDS access is acceptable.

**DASL Tiles spec maturity:** The tiles spec is evolving. Inter-tile invocation and chat context sync are marked "future." The browser should depend on the stable subset (manifest format, sandbox model, loader API) and isolate unstable features behind version checks. Pin `@dasl/tiles` dependency.

**Electron version:** Target current stable Electron (v34+). Use `protocol.handle()` (modern API) rather than deprecated `registerStreamProtocol()`. CSP for tile sandboxing should leverage Electron's webContents isolation and `webPreferences.sandbox`.

**Rate limiting:** PDS XRPC endpoints may rate-limit aggressive fetching. Implement request queuing with backoff. Cache resolved records and identity data locally. Slingshot reduces PLC directory load for identity resolution.
