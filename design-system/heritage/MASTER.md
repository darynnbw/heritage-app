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

Use `--space-1` … `--space-16` (4/8 rhythm, rem). No one-off px.  
Radius: `--radius-sm` / `--radius` / `--radius-lg`.  
**Touch:** `--touch` (`2.75rem` / 44px) on every control. Do not shrink buttons below that.  
Layout: `--page-width`, `--gutter`, `--tab-h`.  
Icons: `--icon-sm` … `--icon-tab`.

**One owner.** Parent `gap` *or* child `margin` — not both on the same edge. Stacking them (e.g. `gap: 4px` plus label `margin-bottom: 8px`) is how “weird” 12px gaps appear.

**Proximity — only when a group sits inside a box.** Space between related pieces must be *smaller* than the box padding, or the content does not read as one unit. Use this on the Home prompt card, empty states, and any card whose question/heading shares the box with actions. Do **not** copy those numbers onto feed or person cards (those stay denser `--space-4` padding — list items, not a hero).

| Situation | Token | When it applies |
|-----------|--------|-----------------|
| Label → input / select / textarea | `--space-2` (8px), parent `gap` | Every form field, including optional Question. Tight: the label names that control. Do not stretch this to match section gaps. |
| Controls in one cluster (button row) | `--space-3` (12px) | Buttons that are alternatives to each other, not to the copy above. |
| Question / heading → actions inside a card | `--space-4` mobile, `--space-5` desktop | Prompt card (and similar). Must stay tighter than that card’s padding. |
| Field → next field | `--space-5` (20px) | Form stacks (write, onboarding). Between fields, not inside a field. |
| Page heading → first field / section | `--space-6` mobile, `--space-8` desktop | “Add story” → the form. Heading is a different group. |
| Card padding (prompt hero only) | even `--space-6`; desktop `--space-8` | All four sides equal. Extra top padding to “float” the question is not a hierarchy tool. |
| Page sections (prompt vs feed) | `--space-6` mobile, `--space-8` desktop | Larger than anything inside either section. |

Canonical CSS: `.mvp-prompt-card`, `.mvp-field`, `.mvp-write`, `.mvp-write-main` in `src/mvp/mvp.css`.

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
| Home | None (prompt card is the hero; empty = `illustration-journal.svg`) |
| People | None (empty = `illustration-people.svg` + CTA) |
| Relative | None (empty = `illustration-journal.svg` + CTA) |
| Story read | Modest `illustration-reading.svg` above the title; story text stays the focus |
| Write | None |
| Settings | None (credits link Storyset) |
| Not found | `illustration-not-found.svg` + “Go home”. Open `/not-found` or a missing `/people/:id` / `/stories/:id`. |

`illustration-journal.svg` is for empty writing states only — not forms, not story read.

---

## Components

- **Primary:** `--accent` / `--on-accent`, hover `--accent-hover`
- **Secondary:** `--fill` / `--ink`
- **Ghost:** paper + `--line` border
- **Danger:** `--danger` / `--on-accent`
- **Empty:** `.mvp-empty-state` — icon, title, body, optional CTA
- **Prompt card:** even padding; `gap` (not quote margin) between question and actions
- **Field:** flex column, `gap: var(--space-2)` between label and box; no extra margin on `.mvp-label`
- **One focal point per screen**

---

## Anti-patterns

- Gold / black luxury, Cormorant, Montserrat, liquid glass
- Raw hex in TSX (except brand marks)
- Large illustration where content should lead
- Hover-only actions; missing empty/error states
- Touch targets under 44px
- Gap + child margin on the same edge
- Asymmetric card padding to “fix” hierarchy (use type/weight, then even padding)
- Label→box gap that does not match other fields on the same form
