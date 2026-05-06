# Atmosphere Browser Test Requirements

Maps each acceptance criterion (AC1-AC9) to either an automated test or documented human verification procedure.

---

## AC1: Semantic rendering of app.bsky.* records

Implementation phase: Phase 4

### AC1.1 — Navigating to `at://handle` displays profile tile with avatar, display name, and bio

| Attribute | Value |
|-----------|-------|
| **Automation** | Partially automated + human verification |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/tiles/profile-tile.test.ts` |
| **What the unit test verifies** | Profile tile component receives a record with displayName, description, and avatar blob ref, and renders the correct DOM structure (display name text, bio text, img element for avatar) |
| **Human verification** | Launch app with `electron-vite dev`, navigate to `at://bsky.app`. Confirm: avatar image loads and displays, display name is visible above handle, bio text renders below handle. Visual layout matches design intent (banner at top, avatar overlapping banner/body boundary). |
| **Why human verification is needed** | Blob fetching requires live PDS communication. Visual layout, image rendering quality, and overall page composition cannot be validated purely through DOM assertions. |

### AC1.2 — Post records render with rich text, resolved facets (mentions as links, URLs as clickable links, hashtags)

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (pure function + component) |
| **Test files** | `src/renderer/utils/rich-text.test.ts`, `src/renderer/tiles/post-tile.test.ts` |
| **What the tests verify** | (1) `segmentRichText` correctly splits text at UTF-8 byte boundaries, handles emoji/multi-byte chars, produces correct facet annotations for mentions, links, and tags. (2) Post tile renders mention facets as clickable spans with `facet-mention` class, link facets as anchor elements, tag facets as styled spans. |
| **Coverage notes** | Thread assembly (`src/main/thread-assembly.test.ts`) verifies parent post fetching for thread context. |

### AC1.3 — Follow records render as a readable list with handle and display name per entry

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/tiles/follow-tile.test.ts` |
| **What the test verifies** | Follow tile receives a record with `subject` DID and `createdAt`, renders the subject as a clickable element that emits a `navigate` event with `at://{did}`. Empty/missing fields render without errors. |

### AC1.4 — Navigating to a non-existent handle shows a clear error page, not a crash or blank screen

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Integration test (IPC + shell) |
| **Test file** | `src/renderer/components/repo-page.test.ts` |
| **What the test verifies** | When `resolveUri` IPC returns `{error: 'Failed to resolve URI'}`, the shell-window sets `tabError` state and renders the error message in the content area. No unhandled exception. Address bar retains the user's input. |
| **Additional human verification** | Launch app, type a nonsense handle (e.g., `at://thisdoesnotexist.invalid`). Confirm: error message displays clearly, no crash dialog, no blank screen, address bar retains the typed input. |

### AC1.5 — Records with empty or minimal fields (no avatar, no bio) render gracefully with placeholders

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/tiles/profile-tile.test.ts` |
| **What the test verifies** | Profile tile with `record = {}` (no avatar, no displayName, no description) renders: avatar placeholder element (smiley), handle as display name fallback, "No bio" italic text. No errors thrown. |

---

## AC2: Tile rendering system

Implementation phase: Phase 3

### AC2.1 — Built-in tiles load from pre-cached local storage without network requests

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (configuration) |
| **Test file** | `src/main/tile-runtime.test.ts` |
| **What the test verifies** | TileMothership is configured with MemoryTileLoader registered first (before CARTileLoader and ATTileLoader). Loader registration order confirms built-in tiles resolve from memory before any network-accessing loader is consulted. |
| **Human verification** | Disconnect network, launch app, navigate to `at://` URI from cache. Confirm: built-in tiles still render without network. |
| **Why human verification is needed** | Full verification requires observing absence of network requests, which is difficult to assert purely in unit tests without mocking the entire loader pipeline. |

### AC2.2 — Tile sandbox prevents network access beyond manifest-declared resources

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (configuration) |
| **Test file** | `src/main/tile-sandbox.test.ts` |
| **What the test verifies** | CSP headers produced by `configureTileSandbox` include `connect-src 'none'` (blocks network). CORP and COOP headers are set to `same-origin`. `createSandboxConfig` with empty manifest returns config with no allowed origins. |
| **Human verification** | Open DevTools in tile iframe, attempt `fetch('https://example.com')` in console. Confirm: CSP blocks the request. |
| **Why human verification is needed** | CSP enforcement is a browser-level concern that requires Electron's web request pipeline to actually intercept and block requests. Unit tests verify configuration correctness but not enforcement. |

### AC2.3 — Tile context API delivers record, lexicon, engagement, and identity data to tiles

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (factory function) |
| **Test file** | `src/main/tile-context.test.ts` |
| **What the test verifies** | `createTileContext` produces an object with all required fields: `record` (passthrough), `lexicon` (passthrough), `engagement` (defaults to zeroed when not provided), `identity` (did, handle, pds), `auth` (null by default), `navigate` (callback passthrough). |

### AC2.4 — A malformed tile manifest fails to load with an error message rather than crashing the browser

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/tile-host.test.ts` |
| **What the test verifies** | When `load-tile` IPC returns `{success: false, error: 'Manifest parse error'}`, tile-host renders `<div class="tile-error">` with the error message and falls back to `<schema-fallback>`. No exception propagates. |

### AC2.5 — Tile that throws a runtime error is caught; browser shows fallback rather than blank content

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/tile-host.test.ts`, `src/renderer/components/schema-fallback.test.ts` |
| **What the tests verify** | (1) tile-host catches rendering errors and sets `tileError` state, triggering fallback display. (2) schema-fallback's `render()` has a try/catch that returns an error boundary message when record data causes an exception. |

---

## AC3: Navigation

Implementation phase: Phase 2

### AC3.1 — Typing `at://handle.bsky.social` in address bar resolves and navigates to repo page

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component event) |
| **Test file** | `src/renderer/components/address-bar.test.ts` |
| **What the test verifies** | Setting input value to `at://handle.bsky.social` and pressing Enter emits a `navigate` CustomEvent with `detail.uri === 'at://handle.bsky.social'`. |
| **Integration coverage** | `src/renderer/components/shell-window.test.ts` verifies the full flow: navigate event triggers `resolveUri` IPC call, response populates content area. |

### AC3.2 — Typing bare handle (no `at://` prefix) auto-prefixes and resolves

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component logic) |
| **Test file** | `src/renderer/components/address-bar.test.ts` |
| **What the test verifies** | Input value `handle.bsky.social` (no prefix) emits navigate event with `detail.uri === 'at://handle.bsky.social'`. The auto-prefix logic adds `at://` when input does not start with `at://` or `did:`. |

### AC3.3 — Back/forward buttons traverse per-tab history

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (pure data model) |
| **Test file** | `src/renderer/state/tab-manager.test.ts` |
| **What the test verifies** | After `navigateTab` with URIs A, B, C: `goBack` returns to B (historyIndex decrements), `goBack` again returns to A. `goForward` from A returns to B. `goBack` at index 0 is a no-op. `goForward` at end of history is a no-op. |
| **Component test** | `src/renderer/components/nav-controls.test.ts` verifies back button disabled when `canGoBack=false`, forward disabled when `canGoForward=false`, and clicking enabled buttons emits correct events. |

### AC3.4 — Clicking an AT-URI link in a tile navigates within the browser

| Attribute | Value |
|-----------|-------|
| **Automation** | Partially automated |
| **Test type** | Unit test (event dispatch) |
| **Test files** | `src/renderer/tiles/post-tile.test.ts`, `src/renderer/tiles/follow-tile.test.ts` |
| **What the unit tests verify** | Tiles emit `CustomEvent('navigate', {detail: {uri}, bubbles: true, composed: true})` when an AT-URI link is clicked. Mention clicks in post-tile emit navigate with `at://{did}`. Follow-tile subject clicks emit navigate with `at://{subject}`. |
| **Human verification** | Navigate to a post with mentions. Click a mention. Confirm: browser navigates to that user's profile within the same tab. No external browser opens. |
| **Why human verification is needed** | Full event propagation across Shadow DOM boundaries (composed: true) and shell-window event handling requires the complete Lit/Electron runtime to verify end-to-end. |

### AC3.5 — Multiple tabs maintain independent navigation state

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (pure data model) |
| **Test file** | `src/renderer/state/tab-manager.test.ts` |
| **What the test verifies** | Create two tabs. Navigate tab 1 to URI A, tab 2 to URI B. Verify tab 1 URI is A and tab 2 URI is B. Navigate tab 1 to URI C. Verify tab 2 still has URI B. Each tab's history array is independent. |
| **Component test** | `src/renderer/components/tab-bar.test.ts` verifies rendering multiple tabs with distinct titles and switching emits correct tabId. |

### AC3.6 — Navigating to an unresolvable handle shows error, address bar retains input for correction

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Integration test (shell component) |
| **Test file** | `src/renderer/components/shell-window.test.ts` |
| **What the test verifies** | When IPC `resolve-uri` returns `{error: '...'}`: tab state gets error set, address bar `hasError` property is true (triggers error CSS class), address bar input value is not cleared (retains user's original text). |

### AC3.7 — Navigating to `at://did:plc:xyz` directly (without handle) resolves via PLC

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (identity resolution) + integration |
| **Test file** | `src/renderer/components/shell-window.test.ts` |
| **What the test verifies** | Address bar input `at://did:plc:xyz` is passed to `resolveUri` IPC without modification (no `at://` double-prefix). Shell-window passes the URI through correctly. Identity module (`src/main/identity.ts`) handles `did:` prefix by querying PLC directory directly. |

---

## AC4: Blob handling

Implementation phase: Phase 4

### AC4.1 — Images referenced by CID in post embeds render inline

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component + service) |
| **Test files** | `src/main/blob-service.test.ts`, `src/renderer/tiles/post-tile.test.ts` |
| **What the tests verify** | (1) `constructBlobUrl` produces correct URL format: `{pds}/xrpc/com.atproto.sync.getBlob?did={did}&cid={cid}`. (2) Post tile with `embed.$type === 'app.bsky.embed.images'` triggers `fetchBlob` for each image's `ref.$link` CID. When blob resolves, renders `<img>` element with data URI source. |
| **Human verification** | Navigate to a post with images. Confirm images render inline, not as broken image icons. |

### AC4.2 — Video blobs render with a playable video element

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/tiles/post-tile.test.ts` |
| **What the test verifies** | Post tile with `embed.$type === 'app.bsky.embed.video'` renders a `<video controls>` element in the DOM. |
| **Human verification** | Navigate to a post with video. Confirm: video element appears, controls are visible, playback initiates on click. |
| **Why human verification is needed** | Actual video playback depends on codec support, blob streaming, and Electron's media pipeline. DOM presence alone does not confirm playability. |

### AC4.3 — Missing or unreachable blob shows placeholder image, not broken element

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (service + component) |
| **Test files** | `src/main/blob-service.test.ts`, `src/renderer/tiles/post-tile.test.ts` |
| **What the tests verify** | (1) `fetch-blob` IPC returns `null` (not throws) when blob is unreachable (HTTP error or network failure). (2) Post tile with image embed where `fetchBlob` returns `null` renders `<div class="placeholder">` instead of a broken `<img>`. Profile tile with no avatar CID renders avatar-placeholder div. |

### AC4.4 — Large blobs (>10MB) load progressively without blocking page rendering

| Attribute | Value |
|-----------|-------|
| **Automation** | Not fully automated |
| **Test type** | Unit test (architecture verification) |
| **Test file** | `src/main/blob-service.test.ts` |
| **What the test verifies** | Blob fetch is async (returns Promise), image loading in post-tile uses `loading="lazy"` attribute, and blob fetching does not block the tile's initial render (images start as placeholders). |
| **Human verification** | Navigate to a post with a large image. Confirm: page text and structure render immediately, image loads progressively (placeholder visible, then image appears). No UI freeze during blob download. |
| **Why human verification is needed** | Progressive loading is a runtime performance characteristic that depends on Electron's rendering pipeline, event loop behavior, and actual network latency. Cannot be deterministically asserted in unit tests. |

---

## AC5: Engagement via Constellation

Implementation phase: Phase 5

### AC5.1 — Posts display like, repost, and reply counts

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (client + component) |
| **Test files** | `src/main/constellation-client.test.ts`, `src/renderer/tiles/post-tile.test.ts` |
| **What the tests verify** | (1) `getEngagementCounts` makes parallel requests for likes, reposts, replies sources and returns structured counts. (2) Post tile with engagement data renders `.engagement-bar` containing count values. |

### AC5.2 — Thread view discovers replies via Constellation backlinks

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (service logic) |
| **Test file** | `src/main/thread-assembly.test.ts` |
| **What the test verifies** | `discoverReplies` calls `getReplyBacklinks` with the post URI. When backlinks return records, each is resolved and fetched, producing `ThreadNode` entries in the `replies` array. When Constellation is unavailable, replies array is empty (graceful degradation). |

### AC5.3 — Constellation unavailability shows "counts unavailable" rather than crash or zero

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (client + component) |
| **Test files** | `src/main/constellation-client.test.ts`, `src/renderer/tiles/post-tile.test.ts` |
| **What the tests verify** | (1) When all three Constellation requests fail (network error/timeout), `getEngagementCounts` returns `null`. (2) Post tile with `engagement === null` renders "Engagement counts unavailable" message (not "0" and not blank). |

### AC5.4 — Records with zero engagement show counts as 0, not absent

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/tiles/post-tile.test.ts` |
| **What the test verifies** | Post tile with `engagement = {likes: 0, reposts: 0, replies: 0}` renders the engagement bar with explicit "0 replies", "0 reposts", "0 likes" text. The engagement bar is visible (not hidden or absent). |

---

## AC6: Authentication

Implementation phase: Phase 6

### AC6.1 — OAuth loopback flow completes -- user clicks login, system browser opens, authorization returns to app

| Attribute | Value |
|-----------|-------|
| **Automation** | Partially automated |
| **Test type** | Unit test (flow mechanics) |
| **Test file** | `src/main/auth/oauth-client.test.ts` |
| **What the test verifies** | `startLoginFlow` creates an HTTP server on 127.0.0.1, generates an authorization URL, and when the callback endpoint receives a request with an auth code, resolves with `{did, handle, isAuthenticated: true}`. Server cleanup occurs after resolution. |
| **Human verification** | Click login in the app, enter a test handle. Confirm: system browser opens to PDS authorization page, after authorizing the app receives the callback and shows authenticated state. |
| **Why human verification is needed** | The full OAuth flow involves system browser interaction, PDS server authorization UI, and HTTP redirect back to localhost. These cross-process interactions cannot be automated in a unit test. |

### AC6.2 — Session persists across app restart via stored refresh token

| Attribute | Value |
|-----------|-------|
| **Automation** | Partially automated |
| **Test type** | Unit test (persistence) + integration |
| **Test file** | `src/main/auth/auth-ipc.test.ts` |
| **What the test verifies** | After successful login, `auth-state` IPC returns the authenticated user. `restoreAuthOnStartup` calls `restoreSession` which reads from the session store. |
| **Human verification** | Log in, quit the app, relaunch. Confirm: account widget shows the previously logged-in handle without re-authentication. |
| **Why human verification is needed** | Actual session restore depends on Electron's safeStorage encryption, filesystem persistence across process lifecycle, and OAuth token validity/refresh. |

### AC6.3 — Logged-in state shows current handle in account widget

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/account-widget.test.ts` |
| **What the test verifies** | When `authState` IPC returns `{did, handle: 'user.bsky.social', isAuthenticated: true}`, the account widget renders `@user.bsky.social` text and a logout button (not the login button). |

### AC6.4 — OAuth flow interrupted (user closes browser tab) returns to logged-out state gracefully

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (timeout behavior) |
| **Test file** | `src/main/auth/oauth-client.test.ts` |
| **What the test verifies** | When the loopback server receives no callback within the timeout period (300s), `startLoginFlow` resolves to `null`. Server is closed and cleaned up. `cancelLogin` immediately closes the server and the flow resolves to `null`. |
| **Component test** | `src/renderer/components/account-widget.test.ts` verifies cancel button calls `authCancel` and returns UI to logged-out state. |

### AC6.5 — Expired token triggers automatic refresh without user intervention

| Attribute | Value |
|-----------|-------|
| **Automation** | Not fully automated |
| **Test type** | Integration test (requires OAuth server behavior) |
| **Test file** | `src/main/auth/auth-ipc.test.ts` |
| **What the test verifies** | `restoreSession` on the OAuth client handles token refresh internally (this is handled by `@atproto/oauth-client-node`'s built-in refresh logic). Test verifies that `restoreAuthOnStartup` succeeds even when the original access token would be expired. |
| **Human verification** | Log in, wait for token to expire (or manually invalidate access token), then perform a write action. Confirm: action succeeds without login prompt appearing. |
| **Why human verification is needed** | Token expiry timing, refresh token exchange with the PDS, and DPoP proof generation are handled by the OAuth library's internal state machine. Verifying the full refresh cycle requires real token lifecycle. |

---

## AC7: Write actions

Implementation phase: Phase 6

### AC7.1 — Authenticated user can like a post (creates `app.bsky.feed.like` record)

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (IPC handler) |
| **Test file** | `src/main/auth/write-operations.test.ts` |
| **What the test verifies** | `write-like` IPC handler calls `createRecord` with collection `app.bsky.feed.like` and a record body containing `{$type: 'app.bsky.feed.like', subject: {uri, cid}, createdAt}`. Returns `{success: true, uri, cid}` on success. |
| **Component test** | `src/renderer/tiles/post-tile.test.ts` verifies like button click calls `writeLike` IPC with correct URI and CID arguments. |

### AC7.2 — Authenticated user can repost (creates `app.bsky.feed.repost` record)

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (IPC handler) |
| **Test file** | `src/main/auth/write-operations.test.ts` |
| **What the test verifies** | `write-repost` IPC handler calls `createRecord` with collection `app.bsky.feed.repost` and a record body containing `{$type: 'app.bsky.feed.repost', subject: {uri, cid}, createdAt}`. Returns `{success: true, uri, cid}`. |
| **Component test** | `src/renderer/tiles/post-tile.test.ts` verifies repost button click calls `writeRepost` IPC with correct URI and CID. |

### AC7.3 — Authenticated user can reply to a post (creates `app.bsky.feed.post` with reply ref)

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (IPC handler) |
| **Test file** | `src/main/auth/write-operations.test.ts` |
| **What the test verifies** | `write-reply` IPC handler calls `createRecord` with collection `app.bsky.feed.post` and a record body containing `{$type: 'app.bsky.feed.post', text, reply: {parent: {uri, cid}, root: {uri, cid}}, createdAt}`. |

### AC7.4 — Write actions hidden/disabled when not authenticated

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/tiles/post-tile.test.ts` |
| **What the test verifies** | Post tile with `isAuthenticated = false` does not render the `.interaction-bar` element. No like, repost, or reply buttons are present in the DOM. |

### AC7.5 — Write failure (network error, auth expired) shows error message, does not corrupt local state

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (IPC handler + component) |
| **Test files** | `src/main/auth/write-operations.test.ts`, `src/renderer/tiles/post-tile.test.ts` |
| **What the tests verify** | (1) When `createRecord` fetch fails (network error), write operation returns `{success: false, error: 'Write error: ...'}` without throwing. When auth is null, returns `{success: false, error: 'Not authenticated'}`. (2) Post tile sets `writeError` state on failure and renders `.write-error` message. Like/repost success state is not toggled on failure. |

---

## AC8: Bookmarks and feeds

Implementation phase: Phase 7

### AC8.1 — User can bookmark any AT-URI

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (data model) |
| **Test file** | `src/main/bookmarks.test.ts` |
| **What the test verifies** | `bookmarks-add` IPC handler appends a bookmark with the given URI and title to the bookmarks list. `bookmarks-list` returns the saved bookmark. `bookmarks-remove` filters out the matching URI. `bookmarks-is-bookmarked` returns true for saved URIs. |
| **Component test** | `src/renderer/components/bookmark-bar.test.ts` verifies clicking a bookmark chip emits a navigate event with the bookmark's URI. |

### AC8.2 — Feed generator AT-URIs are bookmarkable and navigable

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (data model + component) |
| **Test files** | `src/main/bookmarks.test.ts`, `src/renderer/tiles/feed-tile.test.ts` |
| **What the tests verify** | (1) A feed generator URI (e.g., `at://did:plc:xyz/app.bsky.feed.generator/my-feed`) is saved and loaded identically to any other URI by the bookmark system. (2) Feed tile renders feed name, description, and creator DID when given a feed generator record. |

### AC8.3 — Bookmarks persist across app restart

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (filesystem persistence) |
| **Test file** | `src/main/bookmarks.test.ts` |
| **What the test verifies** | After `bookmarks-add`, the bookmarks JSON file exists at the expected path and contains the saved bookmark. A fresh `loadBookmarks()` call reads back the previously saved data. |
| **Human verification** | Add a bookmark, quit the app, relaunch. Confirm: bookmark bar shows the previously saved bookmark. |
| **Why human verification is needed** | Full lifecycle persistence depends on Electron's `app.getPath('userData')` resolution and filesystem durability across process exit. |

### AC8.4 — Bookmarked URI that no longer resolves shows "unavailable" indicator

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/bookmark-bar.test.ts` |
| **What the test verifies** | Bookmark bar chip with its URI in the `unavailableUris` array renders with the `unavailable` CSS class (which applies opacity reduction and line-through text decoration). |
| **Integration note** | Shell-window is responsible for tracking which bookmark URIs fail resolution and passing them to the bookmark bar. This tracking logic should be tested in `shell-window.test.ts`. |

---

## AC9: Unknown lexicon fallback

Implementation phase: Phase 3 (basic) + Phase 7 (enhanced)

### AC9.1 — Records with unknown lexicon NSID render as auto-generated structured view from resolved schema

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component + service) |
| **Test files** | `src/renderer/components/schema-fallback.test.ts`, `src/main/lexicon-resolver.test.ts` |
| **What the tests verify** | (1) Schema-fallback component receives a record and renders field names with `.field-name` class and values with `.field-value` class. (2) Lexicon resolver fetches schema via XRPC and caches it. When schema is provided, fallback annotates fields with declared types from the schema. |

### AC9.2 — Schema fallback shows field names, types, and values in human-readable format

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/schema-fallback.test.ts` |
| **What the test verifies** | Given a record `{name: "test", count: 42, tags: ["a", "b"]}`, schema-fallback renders: "name" with type "(string)", value `"test"`; "count" with type "(number)", value `42`; "tags" with type "(array[2])" and indexed items. Type annotations use `getTypeName()` logic. |

### AC9.3 — Unresolvable lexicon schema falls back to raw JSON display with syntax highlighting

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/json-viewer.test.ts` |
| **What the test verifies** | json-viewer component receives arbitrary data and renders it as formatted JSON inside a `<pre>` element. Syntax highlighting applies CSS classes: `.key` for property names, `.string` for string values, `.number` for numbers, `.boolean` for booleans, `.null` for null values. |
| **Integration note** | The tile-host/schema-fallback chain should fall through to json-viewer when lexicon resolution returns null. This routing is tested in `tile-host.test.ts`. |

### AC9.4 — Record with deeply nested objects renders with collapsible sections

| Attribute | Value |
|-----------|-------|
| **Automation** | Automated |
| **Test type** | Unit test (component) |
| **Test file** | `src/renderer/components/schema-fallback.test.ts` |
| **What the test verifies** | Given a record with 3+ levels of nesting, schema-fallback renders nested objects (depth > 1) with a toggle button. Toggling collapses/expands the nested content. Depth limit of 10 prevents infinite recursion (renders "[max depth]" text). |
| **Human verification** | Navigate to a record with complex nested structure (e.g., a threadgate or labeler policy). Confirm: nested sections have toggle controls, clicking toggles visibility, deeply nested data is still accessible. |

---

## Test Infrastructure Summary

| Test runner | Vitest 3.x |
|-------------|------------|
| Configuration | `vitest.config.ts` at project root |
| Test pattern | `src/**/*.test.ts` |
| Environment | `node` for main process tests, `happy-dom` or `jsdom` for component tests |
| Coverage | `@vitest/coverage-v8` |
| Scripts | `npm test` (run once), `npm run test:watch` (watch mode) |

### Test File Index

| File | AC Coverage | Phase |
|------|-------------|-------|
| `src/renderer/state/tab-manager.test.ts` | AC3.3, AC3.5 | 2 |
| `src/renderer/components/address-bar.test.ts` | AC3.1, AC3.2, AC3.6 | 2 |
| `src/renderer/components/tab-bar.test.ts` | AC3.5 | 2 |
| `src/renderer/components/nav-controls.test.ts` | AC3.3 | 2 |
| `src/renderer/components/shell-window.test.ts` | AC3.1, AC3.2, AC3.3, AC3.5, AC3.6, AC3.7 | 2 |
| `src/main/tile-context.test.ts` | AC2.3 | 3 |
| `src/main/tile-runtime.test.ts` | AC2.1 | 3 |
| `src/main/tile-sandbox.test.ts` | AC2.2 | 3 |
| `src/renderer/components/schema-fallback.test.ts` | AC2.5, AC9.1, AC9.2, AC9.4 | 3, 7 |
| `src/renderer/components/tile-host.test.ts` | AC2.1, AC2.3, AC2.4, AC2.5 | 3 |
| `src/main/blob-service.test.ts` | AC4.1, AC4.3, AC4.4 | 4 |
| `src/renderer/utils/rich-text.test.ts` | AC1.2 | 4 |
| `src/renderer/tiles/profile-tile.test.ts` | AC1.1, AC1.5, AC4.1 | 4 |
| `src/renderer/tiles/post-tile.test.ts` | AC1.2, AC4.1, AC4.2, AC4.3, AC5.1, AC5.3, AC5.4, AC7.1, AC7.2, AC7.4, AC7.5 | 4, 5, 6 |
| `src/renderer/tiles/follow-tile.test.ts` | AC1.3 | 4 |
| `src/renderer/components/repo-page.test.ts` | AC1.1, AC1.4 | 4 |
| `src/main/thread-assembly.test.ts` | AC1.2, AC5.2 | 4, 5 |
| `src/main/constellation-client.test.ts` | AC5.1, AC5.3 | 5 |
| `src/main/engagement-ipc.test.ts` | AC5.1, AC5.4 | 5 |
| `src/main/auth/oauth-client.test.ts` | AC6.1, AC6.4 | 6 |
| `src/main/auth/auth-ipc.test.ts` | AC6.2, AC6.3, AC6.5 | 6 |
| `src/renderer/components/account-widget.test.ts` | AC6.3, AC6.4 | 6 |
| `src/main/auth/write-operations.test.ts` | AC7.1, AC7.2, AC7.3, AC7.5 | 6 |
| `src/main/bookmarks.test.ts` | AC8.1, AC8.2, AC8.3 | 7 |
| `src/renderer/components/bookmark-bar.test.ts` | AC8.1, AC8.4 | 7 |
| `src/renderer/tiles/feed-tile.test.ts` | AC8.2 | 7 |
| `src/renderer/components/json-viewer.test.ts` | AC9.3 | 7 |
| `src/main/lexicon-resolver.test.ts` | AC9.1 | 7 |
| `src/main/request-queue.test.ts` | (infrastructure) | 7 |

### Human Verification Checklist

These criteria require manual testing in the running Electron app (`npx electron-vite dev`):

| AC | What to verify manually | Why |
|----|-------------------------|-----|
| AC1.1 | Profile loads with actual avatar image from PDS | Live blob fetch + visual rendering |
| AC2.1 | Tiles render offline (disconnect network) | Network absence verification |
| AC2.2 | CSP blocks network in tile sandbox (DevTools) | Browser-level enforcement |
| AC3.4 | In-tile AT-URI link navigates within browser | Cross-Shadow-DOM event propagation |
| AC4.2 | Video playback works | Codec support + media pipeline |
| AC4.4 | Large blobs load progressively | Runtime performance characteristic |
| AC6.1 | Full OAuth round-trip with system browser | Cross-process auth flow |
| AC6.2 | Session persists across app restart | Process lifecycle + filesystem |
| AC6.5 | Token auto-refresh on expiry | Real token lifecycle |
| AC8.3 | Bookmarks persist across restart | Process lifecycle + filesystem |
| AC9.4 | Collapsible sections UX for nested records | Interactive UI behavior |
