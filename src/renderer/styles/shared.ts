import { css } from 'lit'

export const shellColors = css`
  :host {
    --shell-bg: #f8f7f5;
    --shell-fg: #1a1a1a;
    --shell-surface: #ffffff;
    --shell-surface-sunken: #f0efec;
    --shell-border: #e2e0dc;
    --shell-border-subtle: #eceae6;
    --shell-accent: #2563eb;
    --shell-accent-hover: #1d4ed8;
    --shell-accent-subtle: #eff4ff;
    --shell-error: #c4342d;
    --shell-success: #1a7f37;
    --shell-text-muted: #5c5c5c;
    --shell-text-tertiary: #8a8a8a;
    --shell-input-bg: #f0efec;
    --shell-tab-active: #ffffff;
    --shell-tab-inactive: #f8f7f5;

    --font-display: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-mono: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, monospace;

    --ease-snappy: cubic-bezier(0.16, 1, 0.3, 1);
    --duration-fast: 100ms;
    --duration-normal: 150ms;

    --shadow-float: 0 4px 16px oklch(0% 0 0 / 0.08), 0 1px 4px oklch(0% 0 0 / 0.04);
    --shadow-focus: 0 0 0 2px #2563eb;

    --content-narrow: 640px;
    --content-medium: 720px;
    --content-wide: 900px;
    --content-pad: 24px;
  }
`
