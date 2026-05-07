# Atmosphere Browser

Last verified: 2026-05-06

## Tech Stack
- Runtime: Electron 34 (main + renderer processes)
- Language: TypeScript 5.7
- UI: Lit 3 web components (no React/Vue)
- Tiles: @dasl/tiles for pluggable record renderers
- Auth: @atproto/oauth-client-node (loopback flow)
- Build: electron-vite 5 (Vite 6)
- Testing: Vitest 3 (node environment, no browser tests)

## Commands
- `npm run dev` - Start Electron in dev mode with HMR
- `npm run build` - Production build to out/
- `npm run test` - Run all tests (327 tests, 32 files)
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint

## Project Structure
- `src/main/` - Electron main process (IPC handlers, network I/O, data persistence)
- `src/main/auth/` - OAuth authentication (loopback flow, session store, write ops)
- `src/preload/` - Context bridge exposing `window.atBrowser` API
- `src/renderer/` - Lit web components for browser shell
- `src/renderer/components/` - Shell UI (tabs, address bar, nav, settings)
- `src/renderer/tiles/` - Built-in record renderers (post, profile, follow, list, feed, thread)
- `src/renderer/state/` - Pure functional state management (tab-manager)
- `src/renderer/utils/` - Pure helpers (rich-text, formatting, AT-URI parsing)
- `src/shared/` - Type declarations shared across processes

## Conventions
- Functional Core / Imperative Shell pattern (annotated with `// pattern:` comments)
- All types are `readonly` (immutable by default)
- IPC channel names are kebab-case verbs: `resolve-uri`, `write-like`, `bookmarks-add`
- Tiles are custom elements registered via `@customElement('name-tile')`
- Navigation uses `CustomEvent('navigate', { detail: { uri } })` bubbling up
- All main-process modules export a `registerXxxIpc()` function

## Architecture
- Main process handles ALL network I/O (XRPC, Constellation, Slingshot, OAuth)
- Renderer NEVER makes network calls; everything goes through preload bridge
- Identity resolution: Slingshot (fast) -> PLC directory (fallback) -> DNS (last resort)
- Engagement data: Constellation backlink index (blue.microcosm.links.*)
- State is per-tab with history stack; pure functions update immutable state

## External Services
- Slingshot: `slingshot.microcosm.blue` - Identity resolution (MiniDoc)
- Constellation: `constellation.microcosm.blue` - Engagement counts and backlinks
- PLC Directory: `plc.directory` - DID document resolution (fallback)
- PDS instances: Direct XRPC calls for repo/record/blob data

## Boundaries
- Safe to edit: `src/`
- Never touch: `package-lock.json`, `node_modules/`, `out/`
- Persistence files stored in `app.getPath('userData')`: bookmarks.json, history.json
