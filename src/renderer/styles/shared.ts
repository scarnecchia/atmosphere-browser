import { css } from 'lit'

export const resetStyles = css`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`

export const shellColors = css`
  :host {
    --shell-bg: #1e1e2e;
    --shell-fg: #cdd6f4;
    --shell-surface: #313244;
    --shell-border: #45475a;
    --shell-accent: #89b4fa;
    --shell-error: #f38ba8;
    --shell-text-muted: #a6adc8;
    --shell-input-bg: #11111b;
    --shell-tab-active: #313244;
    --shell-tab-inactive: #1e1e2e;
  }
`
