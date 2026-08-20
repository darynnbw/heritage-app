# Design System (Heritage)

## Direction
- **Personality**: Warm, intimate, archival, premium
- **Foundation**: Warm parchment tones, amber gold accents, dark slate text
- **Themes**: Dark/Light modes supported via `[data-theme="dark"]` attribute on document root.
- **Typography**:
  - Headings / Stories: `'Playfair Display'`, Georgia, serif
  - UI / Body: `'Plus Jakarta Sans'`, system-ui, sans-serif

## Tokens

### Colors (Light Mode)
- `--bg-parchment`: `#f6f2e9`
- `--bg-card`: `#fdfcf9`
- `--text-slate`: `#2b333a`
- `--text-slate-muted`: `#5e6b75`
- `--amber-gold`: `#c3843f`
- `--amber-light`: `#f7ede1`
- `--border-muted`: `#e4decb`

### Colors (Dark Mode)
- `--bg-parchment`: `#181914`
- `--bg-card`: `#282a20`
- `--text-slate`: `#e6e3da`
- `--text-slate-muted`: `#aca79b`
- `--amber-gold`: `#e2a056`
- `--amber-light`: `#3d3b2e`
- `--border-muted`: `#3a3c30`

### Spacing & Grid
- **Base Grid**: 4px / 8px grid alignment
- **Touch Target**: Minimum `44x44px` (2.75rem) for all interactive buttons and triggers.

## Layout & Patterns
- **Canvas Map View**: Organic layout of absolute card nodes connected by curved SVG lines on desktop viewports.
- **Responsive List View**: On mobile viewports (`<768px`), absolute coordinates are hidden in favor of a responsive card list layout (`.people-list-view`).
- **Profile Bottom Sheet**: On mobile viewports, the sliding Profile Panel acts as a bottom sheet drawer.
- **Focus States**: `:focus-visible` outline rings with `2px solid var(--amber-gold)` and `2px` offset.
- **Active Interactions**: Spring scale compression `scale(0.96)` for click tactile feedback.
- **Danger States**: Semantic red styling via `.btn-danger-outline` for destructive operations.
