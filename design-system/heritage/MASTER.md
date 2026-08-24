# Heritage design system

Canonical implementation: `src/mvp/mvp.css` (`:root`). Match those names — do not invent a second palette.

**Product:** family curator MVP — typed stories about a relative.  
**Voice:** editorial, warm, calm. Not luxury gold, not liquid glass.

---

## Color

Hex lives in `:root` only. Components use tokens.

| Role | Token | Hex |
|------|--------|-----|
| Paper | `--paper` | `#ffffff` |
| Wash (desktop canvas) | `--wash` | `#f8fafc` |
| Fill / secondary button | `--fill` | `#f1f5f9` |
| Fill hover | `--fill-hover` | `#e2e8f0` |
| Ink | `--ink` | `#0f172a` |
| Soft | `--soft` | `#334155` |
| Quiet | `--quiet` | `#64748b` |
| On accent | `--on-accent` | `#ffffff` |
| Line | `--line` | `#cbd5e1` |
| Accent (teal) | `--accent` | `#0f766e` |
| Accent hover | `--accent-hover` | `#0d5c56` |
| Accent subtle | `--accent-subtle` | `#f0fdfa` |
| Danger | `--danger` | `#b91c1c` |
| Danger hover | `--danger-hover` | `#991b1b` |
| Danger soft | `--danger-soft` | `#fde8e8` |
| Focus ring | `--focus-ring` | `rgba(15, 118, 110, 0.35)` |
| Scrim | `--scrim` | `rgba(15, 23, 42, 0.4)` |

Keep illustration SVGs on `#0F766E` / `#0f766e`. Official Google/Apple mark fills are the only other raw hex in components.

---

## Type

- **Serif (headings, quotes, story titles):** Lora → `--font-serif`
- **Sans (UI, body chrome):** Instrument Sans → `--font-sans`
- Scale: `--text-xs` … `--text-4xl` (rem / `clamp`). No one-off pixel type.

---

## Space, radius, touch

Use `--space-1` … `--space-16` (4/8 rhythm, rem).  
Radius: `--radius-sm` / `--radius` / `--radius-lg`.  
**Touch:** `--touch` (`2.75rem` / 44px) on every control. Do not shrink buttons below that.  
Layout: `--page-width`, `--gutter`, `--tab-h`.  
Icons: `--icon-sm` … `--icon-tab`.

---

## Icons

Lucide only. `currentColor`. Decorative icons: `aria-hidden`. No emoji-as-icon.

---

## Illustrations (page rule)

| Screen | Illustration |
|--------|----------------|
| Welcome | Large hero `illustration-welcome.svg` |
| Login / Signup | None (form + Lucide in fields) |
| Onboarding intro | Medium `illustration-reading.svg` |
| Onboarding relative / story | None |
| Home | None (prompt is the page lead, not a card; empty = `illustration-journal.svg`) |
| People | None (empty = `illustration-people.svg` + CTA) |
| Relative | None (empty = `illustration-journal.svg` + CTA) |
| Story read | Modest `illustration-reading.svg` above the title; story text stays the focus |
| Write | None |
| Settings | None (credits link Storyset) |
| Not found | `illustration-not-found.svg` (404 landscape) + “Go home” |

`illustration-journal.svg` is for empty writing states only — not forms, not story read.

---

## Components

- **Primary:** `--accent` / `--on-accent`, hover `--accent-hover`
- **Secondary:** `--fill` / `--ink`
- **Ghost:** paper + `--line` border
- **Danger:** `--danger` / `--on-accent`
- **Empty:** `.mvp-empty-state` — icon, title, body, optional CTA
- **One focal point per screen**

---

## Anti-patterns

- Gold / black luxury, Cormorant, Montserrat, liquid glass
- Raw hex in TSX (except brand marks)
- Large illustration where content should lead
- Hover-only actions; missing empty/error states
- Touch targets under 44px
