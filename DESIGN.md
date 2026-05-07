---
name: Atmosphere Browser
description: A desktop browser for the AT Protocol atmosphere.
colors:
  surface: "#f8f7f5"
  surface-raised: "#ffffff"
  surface-sunken: "#f0efec"
  ink: "#1a1a1a"
  ink-secondary: "#5c5c5c"
  ink-tertiary: "#8a8a8a"
  border: "#e2e0dc"
  border-subtle: "#eceae6"
  border-hover: "#c8c5c0"
  accent: "#2563eb"
  accent-hover: "#1d4ed8"
  accent-subtle: "#eff4ff"
  error: "#c4342d"
  success: "#1a7f37"
  syntax-green: "#1a7f37"
  syntax-amber: "#9a6700"
  syntax-violet: "#8250df"
typography:
  display:
    fontFamily: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  mono:
    fontFamily: "'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#faf9f7"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-sunken}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-sunken}"
  tab-active:
    textColor: "{colors.ink}"
    padding: "8px 16px"
  tab-inactive:
    textColor: "{colors.ink-secondary}"
    padding: "8px 16px"
  input-address:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  card-content:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Atmosphere Browser

## 1. Overview

**Creative North Star: "The Orderly Window"**

A browser should be invisible. It should not announce itself, decorate itself, or compete with what you came to see. The Atmosphere Browser follows the Vignelli doctrine: if you can design one thing, you can design everything, provided you approach it with discipline, clarity, and the conviction that less is always enough.

The aesthetic is systematic restraint. Warm neutrals, not clinical whites. Precise type hierarchy, not decorative flourishes. Every pixel of chrome exists to orient the user, then disappear. The content is the atmosphere; the browser is the window.

This system explicitly rejects: developer tool aesthetics (dark terminals, monospace-everything, JSON viewers), corporate SaaS dashboards (metric cards, gradient accents, glassmorphism), and protocol-centric UI that expects users to understand DIDs or NSIDs. It also rejects Beaker Browser's rougher edges; the concept of a protocol browser was right, but the interface never became approachable.

**Key Characteristics:**
- Warm neutral palette with a single blue accent used sparingly (the 10% Rule)
- Instrument Sans (variable, self-hosted woff2) for display headings; system font stack for all other text
- Flat surfaces with tonal differentiation (Paper, White, Linen); no decorative shadows
- Snappy transitions (100ms/150ms) with exponential ease-out; state changes only
- Content-first: browser chrome recedes; the atmosphere comes forward
- Body text capped at 65ch; tabular-nums on engagement counts

## 2. Colors: The Warm Neutral Palette

Restrained and warm. Built from off-whites with a slight warm cast (hue ~80 in OKLCH), avoiding clinical pure-white backgrounds. One blue accent does the work of drawing attention; it appears on interactive elements and nowhere else.

### Primary
- **Steady Blue** (#2563eb / oklch(54% 0.22 260)): Interactive elements only: links, active tab indicator, focus rings, primary buttons. Its rarity is the point.
- **Steady Blue Hover** (#1d4ed8 / oklch(48% 0.22 260)): Darkened variant for hover and active states.
- **Accent Tint** (#eff4ff / oklch(96% 0.03 260)): Very subtle blue tint for success states on interaction buttons.

### Neutral
- **Warm Paper** (#f8f7f5 / oklch(97.5% 0.006 80)): Primary background. Slightly warm, like good paper stock. Used as `--shell-bg`.
- **Clean White** (#ffffff): Raised surfaces: cards, panels, active tab backgrounds, focused input fields.
- **Soft Linen** (#f0efec / oklch(95% 0.008 80)): Sunken surfaces: input fields at rest, code blocks, reply input areas, image placeholders.
- **Ink** (#1a1a1a / oklch(18% 0.005 80)): Primary text. Not pure black; warm enough to sit comfortably on warm paper.
- **Secondary Ink** (#5c5c5c / oklch(45% 0.005 80)): Supporting text, metadata, timestamps, secondary labels.
- **Tertiary Ink** (#8a8a8a / oklch(60% 0.005 80)): Placeholder text, disabled nav buttons, dates, resolved DID info.
- **Stone Border** (#e2e0dc / oklch(90% 0.008 80)): Visible borders: toolbar edges, tab bar bottom, thread connectors, input borders.
- **Subtle Border** (#eceae6 / oklch(93% 0.006 80)): Structural borders: record item separators, card outlines, bookmark bar bottom.
- **Border Hover** (#c8c5c0): Darkened border for secondary button hover states.

### Semantic
- **Error Red** (#c4342d / oklch(48% 0.18 25)): Error messages, error state borders.
- **Success Green** (#1a7f37 / oklch(48% 0.14 145)): Success states. Also reused as Syntax Green.
- **Syntax Green** (#1a7f37): JSON viewer string values.
- **Syntax Amber** (#9a6700): JSON viewer number values.
- **Syntax Violet** (#8250df): JSON viewer boolean values.

### Named Rules
**The 10% Rule.** Steady Blue appears on no more than 10% of any screen. It marks what is interactive: links, active tab underlines, focus rings, primary buttons. If blue is everywhere, nothing is clickable.

**The Warm Neutral Rule.** No pure whites (#fff used only for raised surfaces against the warm paper ground), no pure blacks. Every neutral carries a subtle warm cast at hue ~80 with chroma 0.005-0.008. If the interface feels clinical, the neutrals are wrong.

## 3. Typography

**Display Font:** Instrument Sans (variable, self-hosted woff2 at `assets/fonts/`, with system-ui fallback)
**Body Font:** System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, system-ui)
**Mono Font:** SF Mono, Cascadia Code, JetBrains Mono, Menlo

**Character:** Instrument Sans brings geometric clarity with human warmth. Bundled as a variable font (89KB woff2 roman, 95KB italic) with `font-display: swap`. The system stack for body text ensures native rendering speed and platform-appropriate feel. The pairing is disciplined without being sterile.

### Hierarchy
- **Display** (600, 1.25rem, 1.3, -0.01em): Page headings (Settings, Tile Manager), collection titles, profile display names, tile names (list, feed). Instrument Sans via `--font-display`.
- **Body** (400, 0.9375rem, 1.55): Post text, bios, descriptions, list descriptions, record text, error messages, loading states. System stack via `--font-body`. Capped at 65ch.
- **Label** (500, 0.8125rem, 1.4, 0.01em): Tab titles, toolbar button labels, bookmark chips, engagement labels, interaction buttons, collection subtitles, record metadata, tile source badges. System stack.
- **Mono** (400, 0.8125rem, 1.5): Address bar URI display, record rkeys, collection NSIDs, JSON viewer, schema fallback field names, resolved DID info. Via `--font-mono`.

### Named Rules
**The Two-Family Rule.** Instrument Sans for display headings. System stack for everything else. No third typeface. No decorative fonts. If a third family appears, it's a mistake.

**The Fixed Scale Rule.** All type sizes are fixed `rem` values, not fluid. Product UI at consistent viewport sizes does not benefit from viewport-scaled type. The hierarchy is: 1.25rem (display), 0.9375rem (body), 0.8125rem (label/mono), 0.6875rem (tertiary metadata).

## 4. Elevation

Flat by default. Depth is communicated through tonal shifts between three surface layers (Warm Paper #f8f7f5, Clean White #ffffff, Soft Linen #f0efec), not through shadows.

Shadows are reserved for two contexts only:

### Shadow Vocabulary
- **Float** (`0 4px 16px oklch(0% 0 0 / 0.08), 0 1px 4px oklch(0% 0 0 / 0.04)` via `--shadow-float`): Popovers, dropdown menus, tooltips. Diffuse and understated. Not currently used in the alpha; reserved for future popover/dropdown components.
- **Focus** (`0 0 0 2px #2563eb` via `--shadow-focus`): Solid focus rings on all interactive elements via `:focus-visible`. Complemented by a softer `0 0 0 2px oklch(54% 0.22 260 / 0.15)` glow on focused inputs.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Tonal shifts (Paper/White/Linen) establish hierarchy. Shadows appear only for floating elements and focus states. If a card has a drop shadow at rest, it's wrong.

## 5. Components

Components are restrained and functional. They feel like well-made tools: satisfying to use, invisible when not in use. No decorative flourishes, no gradients, no rounded-everything.

### Buttons
- **Shape:** Gently squared (4px radius via `--rounded-sm`)
- **Primary:** Steady Blue background, white text, 6px 16px padding. Used sparingly: "Send Reply" in post interactions. Hover darkens to Accent Hover.
- **Secondary:** Transparent background, Stone Border outline, Ink text, 8px 16px padding. For all non-primary actions (Login, Cancel, Clear History, Clear Tile Cache, Load More). Hover lightens background to Soft Linen, border darkens to Border Hover (#c8c5c0).
- **Ghost:** No border, no background, Ink text, 6px padding. For toolbar actions (nav back/forward/reload, new tab). Hover shows Soft Linen background.
- **Interaction:** Secondary style at 4px 8px padding, Label typography. For post interactions (Like, Repost, Reply). Success state shows Accent colour with Accent Tint background.
- **All:** `focus-visible` shows solid blue focus ring via `--shadow-focus`. Transitions use `--duration-fast` (100ms) with `--ease-snappy`.

### Tabs
- **Style:** Label typography (0.8125rem, 500 weight, 0.01em tracking), no borders except the active indicator.
- **Active:** Ink text, 2px solid Steady Blue bottom border. White background (via `--shell-tab-active`).
- **Inactive:** Secondary Ink text, transparent bottom border. Hover transitions to Ink.
- **Close:** Ghost button at 10px, opacity 0 at rest, appears on tab hover. Hover shows Soft Linen background.
- **New Tab:** Ghost button with + icon, Tertiary Ink, hover transitions to Ink.

### Address Bar
- **Style:** Soft Linen background (via `--shell-input-bg`), Stone Border, Mono font, 6px 12px padding, 4px radius.
- **Focus:** White background, Steady Blue border, subtle blue glow (`oklch(54% 0.22 260 / 0.15)` at 2px spread).
- **Error:** Error Red border.

### Cards / Containers
- **Corner Style:** Gently rounded (8px radius via `--rounded-md`)
- **Background:** Clean White (#ffffff) on Warm Paper ground.
- **Shadow Strategy:** None at rest. Flat-By-Default Rule.
- **Border:** Subtle Border (#eceae6), 1px solid. Hover transitions to Stone Border on interactive cards (collection items).
- **Internal Padding:** 16px (md spacing). Sections use 12px padding for denser list items.

### Navigation Controls
- **Back / Forward / Reload:** Ghost buttons with HTML entity arrows and symbols. Disabled state uses Tertiary Ink (not opacity).
- **Bookmark Bar:** Bookmark chips in Soft Linen background, Label typography (0.8125rem, 500 weight). Hover darkens to Stone Border. Unavailable bookmarks at 0.5 opacity with line-through.
- **Account Widget:** Label typography for handle. Secondary buttons for Login/Logout. Login input uses same style as address bar.

### JSON Viewer
- **Background:** Soft Linen (sunken surface), Mono font throughout.
- **Syntax:** Keys in Steady Blue (600 weight), strings in Syntax Green, numbers in Syntax Amber, booleans in Syntax Violet, nulls and brackets in Tertiary Ink.

### Schema Fallback
- **Font:** Mono throughout, field names in Steady Blue (600 weight).
- **Nesting:** Indented with 1px Subtle Border left line for visual hierarchy.
- **AT URIs:** Clickable links in Steady Blue with underline.

## 6. Do's and Don'ts

### Do:
- **Do** use Warm Paper (#f8f7f5) as the default background, not pure white.
- **Do** keep Steady Blue for interactive elements only: links, buttons, focus rings, active tab indicator.
- **Do** display human-readable names (handles, display names) instead of DIDs and AT URIs wherever possible.
- **Do** make everything that looks clickable actually navigate somewhere. Links go somewhere is the first design principle.
- **Do** use tonal shifts (Paper/White/Linen) instead of shadows for surface hierarchy.
- **Do** keep transitions at 100ms (hover) or 150ms (state changes) with `--ease-snappy` (cubic-bezier(0.16, 1, 0.3, 1)). No choreography.
- **Do** provide alt text for all visual content (avatars, banners, embedded images).
- **Do** cap body text at `max-width: 65ch` for comfortable reading.
- **Do** use `font-variant-numeric: tabular-nums` on engagement counts for stable column alignment.
- **Do** use `:focus-visible` (not `:focus`) for focus rings, so keyboard users see them without cluttering mouse interactions.

### Don't:
- **Don't** use a dark colour scheme as the default. Light and warm is the baseline.
- **Don't** style the interface like Chrome DevTools, a protocol inspector, or a raw JSON viewer.
- **Don't** add gradient accents, glassmorphism, or decorative shadows. This is not a SaaS dashboard.
- **Don't** require users to understand AT Protocol concepts (DIDs, NSIDs, rkeys) to navigate.
- **Don't** use `border-left` or `border-right` greater than 1px as a coloured accent stripe.
- **Don't** use gradient text (`background-clip: text` with gradient).
- **Don't** add choreographed animations, bounce easing, or scroll-driven motion.
- **Don't** introduce a third typeface. Two families (Instrument Sans + system stack). That's it.
- **Don't** use identical card grids with icon + heading + text repeated. Vary the rhythm.
- **Don't** use opacity for disabled states on navigation buttons. Use Tertiary Ink colour instead.
- **Don't** use `font-style: italic` for empty states. Plain text in Tertiary Ink is enough.
