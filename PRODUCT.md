# Product

## Register

product

## Users

Anyone who wants to explore the AT Protocol atmosphere. Not developers, not power users — regular people who are curious about what exists in the network beyond any single app's view of it. They want to click things and go places, not inspect data structures.

## Product Purpose

A desktop browser for the AT Protocol atmosphere. The concept: what if browsing atproto felt like browsing the web — tabs, back/forward, bookmarks, clickable links — but for `at://` URIs instead of `https://`. Inspired by Beaker Browser's vision of making protocols feel tangible and navigable, but with a focus on approachability over technical power.

Success looks like: someone with no protocol knowledge can open the app, type a handle, and explore that person's world — their posts, their follows, their lists — by clicking through links that actually go somewhere.

Early alpha. The foundation is being built; polish and completeness come later.

## Brand Personality

Curious, approachable, grounded.

The atmosphere is vast and strange and interesting. This browser should make exploring it feel like wandering through a space, not operating a tool. Warm without being cutesy. Confident without being slick.

## Anti-references

- Chrome DevTools, protocol inspectors, raw JSON viewers — this is not a developer tool
- Overly corporate SaaS dashboards with metric cards and gradient accents
- Apps that require you to understand the protocol to use them
- Beaker Browser's rougher edges — the concept was right, the approachability wasn't

## Design Principles

1. **Links go somewhere.** Everything that looks clickable navigates. The app is a browser; browsing is the point.
2. **Hide the protocol, show the content.** AT URIs, DIDs, and NSIDs are implementation details. Surface what matters to the person looking at it.
3. **Familiar patterns, new territory.** Tabs, address bar, back/forward — use browser conventions people already know, applied to a new kind of space.
4. **Graceful incompleteness.** The app is early. Unknown record types, missing renderers, and rough edges should feel honest, not broken.
5. **Accessible by default.** Alt text, keyboard navigation, screen reader support, and sufficient contrast are not afterthoughts.

## Accessibility & Inclusion

- WCAG AA baseline
- Alt text support for all visual content
- Keyboard navigable — full tab/arrow key support for all interactive elements
- Screen reader compatible markup
- Sufficient color contrast ratios
- Respect prefers-reduced-motion and prefers-color-scheme
