# Tiles (Built-in Record Renderers)

Last verified: 2026-05-06

## Purpose
Provides rich rendering for known AT Protocol record types (app.bsky.* lexicons).
Each tile is a Lit web component that receives record data as properties and
renders a human-friendly view with engagement data and interactions.

## Contracts
- **Exposes**: Custom elements (`post-tile`, `profile-tile`, `follow-tile`, `list-tile`, `feed-tile`, `thread-tile`)
- **Guarantees**: Tiles render gracefully with partial data. Engagement loads async. Write actions require authentication.
- **Expects**: `record` property (raw record object), identity props (did, handle, pds), `uri` for engagement lookup

## Dependencies
- **Uses**: `window.atBrowser` for blobs, engagement, and write operations
- **Used by**: `record-page` component passes record data to matching tile
- **Boundary**: Tiles never fetch records themselves; they only render what they receive

## Key Decisions
- Built-in over dynamic: Guaranteed quality for core Bluesky lexicons
- Each tile self-contained: Own styles, own embed loading, own engagement display
- Interaction buttons conditional on `isAuthenticated` prop

## Invariants
- Every tile handles null/missing record gracefully (renders `nothing`)
- Engagement counts load independently (tile renders before counts arrive)
- Navigation dispatched as bubbling CustomEvent, never direct window.location

## Supported Lexicons
- `app.bsky.feed.post` - Posts with rich text, embeds, engagement, interactions
- `app.bsky.actor.profile` - User profiles with avatar, banner, bio
- `app.bsky.graph.follow` - Follow records with target identity
- `app.bsky.graph.list` - List records with metadata
- `app.bsky.feed.generator` - Feed generator definitions
- `app.bsky.feed.post` (thread) - Thread assembly with reply chains
