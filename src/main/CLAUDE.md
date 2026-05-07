# Main Process

Last verified: 2026-05-06

## Purpose
Owns all network I/O, data persistence, and system integration. The renderer
process is sandboxed and context-isolated; it can only reach the outside world
through IPC channels registered here.

## Contracts
- **Exposes**: IPC handlers via `ipcMain.handle(channel, handler)`
- **Guarantees**: Every IPC handler returns a result or `{ error: string }` (never throws to renderer)
- **Expects**: Calls arrive through the preload bridge (see `src/shared/preload-api.d.ts` for the full contract)

## Dependencies
- **Uses**: Electron APIs, node:fs, node:http, fetch (network)
- **Used by**: Renderer (via preload bridge only)
- **Boundary**: Never import from `src/renderer/`

## Key Decisions
- Singleton pattern for TileMothership and OAuth client (process-lifetime state)
- All register functions called at startup in index.ts (deterministic init order)
- Request queue with exponential backoff for resilient XRPC calls

## Invariants
- Every module exports `registerXxxIpc()` called once from `index.ts`
- IPC handlers never throw unhandled errors to the renderer
- Identity resolution always returns `ResolvedUri` or null (no partial states)
- Bookmarks and history persist as JSON in userData directory

## Key Files
- `index.ts` - App lifecycle, window creation, IPC registration orchestrator
- `protocol.ts` - `at://` scheme registration
- `identity.ts` - URI parsing and identity resolution chain
- `xrpc-client.ts` - Low-level PDS XRPC calls (describeRepo, listRecords, getRecord, getBlob)
- `constellation-client.ts` - Engagement counts and backlink queries
- `tile-runtime.ts` - TileMothership singleton with loader chain
- `types.ts` - Shared type definitions (ResolvedUri, EngagementData, TileContext)
