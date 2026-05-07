# Renderer Process

Last verified: 2026-05-06

## Purpose
Browser shell UI built entirely with Lit 3 web components. Provides tabbed
navigation, AT-URI address bar, record rendering via tiles, and user interactions.
Fully sandboxed — all data comes through the preload bridge.

## Contracts
- **Exposes**: Custom elements registered globally (shell-window, tab-bar, tile-host, etc.)
- **Guarantees**: Navigation events bubble via `CustomEvent('navigate', { detail: { uri } })`. All network access goes through `window.atBrowser.*`.
- **Expects**: Preload bridge available as `window.atBrowser` (typed in `src/shared/preload-api.d.ts`)

## Dependencies
- **Uses**: Lit 3 (LitElement, html, css), window.atBrowser (preload bridge)
- **Used by**: Electron BrowserWindow loads `index.html` which bootstraps `main.ts`
- **Boundary**: NEVER import from `src/main/`. NEVER use fetch/XMLHttpRequest directly.

## Key Decisions
- Lit over React: Smaller bundle, native web components, no virtual DOM
- Functional Core state: tab-manager is pure functions operating on immutable state
- Built-in tiles over dynamic loading: First-class renderers for app.bsky.* lexicons
- Schema fallback: Unknown record types render as structured JSON with lexicon info

## Invariants
- Components use `shellColors` CSS variables for consistent theming
- All navigation goes through shell-window which manages tab state
- Tiles receive record data as properties, never fetch their own data
- Custom elements registered in `main.ts` import order (side-effect imports)

## Key Files
- `main.ts` - Component registration (import order matters)
- `index.html` - Entry point, contains `<shell-window>`
- `components/shell-window.ts` - Top-level orchestrator (tabs + navigation + content)
- `components/tile-host.ts` - Routes response types to appropriate page/tile components
- `state/tab-manager.ts` - Pure functional tab state (Functional Core)
- `styles/shared.ts` - CSS variables and shared styles
