# Auth Domain

Last verified: 2026-05-06

## Purpose
Provides AT Protocol OAuth authentication using a loopback HTTP server flow.
Once authenticated, enables write operations (like, repost, reply, delete)
on behalf of the user.

## Contracts
- **Exposes**: IPC channels `auth-login`, `auth-logout`, `auth-state`, `auth-cancel`, `write-like`, `write-repost`, `write-reply`, `write-delete`
- **Guarantees**: Session restored automatically on startup. Write ops return `{ success, uri?, cid?, error? }`. Login flow times out after 5 minutes.
- **Expects**: Valid handle for login. Valid AT-URIs and CIDs for write operations.

## Dependencies
- **Uses**: `@atproto/oauth-client-node`, Electron `shell` (opens browser), node:http (loopback server)
- **Used by**: Renderer account-widget, post-tile interaction buttons
- **Boundary**: Auth state is process-global (single user at a time)

## Key Decisions
- Loopback OAuth: Native app cannot host redirect URIs; uses ephemeral local HTTP server
- Single-user model: One authenticated session at a time (no multi-account)
- Session persisted to disk via custom session store for restore on restart

## Invariants
- Only one loopback server active at a time (cancelling kills previous)
- Write operations fail gracefully with error message if not authenticated
- OAuth client is lazily initialized (singleton)

## Key Files
- `oauth-client.ts` - OAuth flow, loopback server, session restore
- `session-store.ts` - Persistent session storage
- `auth-ipc.ts` - IPC handler registration and startup restore
- `write-operations.ts` - Like, repost, reply, delete via authenticated session
