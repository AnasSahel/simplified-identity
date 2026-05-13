# DESIGN.md

The design system for **Simplified Identity** — a developer-grade admin tool for SailPoint Identity Security Cloud. This document follows the [Google Stitch DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/) format: an agent that has never seen this codebase should be able to read it and generate UI that matches the product.

Code is not described here. Primitives live in `apps/web/components/ui/` and are discovered by reading the source. This file is about **look and feel**.

---

## 1. Visual Theme & Atmosphere

Simplified Identity wears the codebase chrome of Linear and the data-density of Vercel Dashboard, but the trust gravity of an admin tool managing real production identities. Pages are dense; chrome is invisible; the only colored thing is the next action.

**Canvas-first.** The product lives on a single neutral canvas. Body, sidebar, and topbar share the same off-white background. Cards, popovers, drawers, and dialogs are pure white surfaces that float on this canvas — distinguished from it by a subtle border and a soft shadow when needed. There is no separating bar between the sidebar and the content area; the sidebar simply *is* the canvas, with an active item that emerges as a white floating card.

**Density.** Default to 14px body, dense data tables (8px vertical padding cells), tight 4–8px gaps. Whitespace is a luxury saved for hero moments (page titles, empty states, sign-in). A list of 25 identities should fit above the fold at 1440×900.

**Accent = next action.** A single indigo accent (`oklch(0.50 0.20 275)`) is reserved for: primary CTAs, focus ring, the active sidebar icon, and the current step in a lifecycle visualization. Everywhere else, color is *semantic* — used to signal status (success / warning / danger / info), never decorative.

**Mono for identifiers.** Every machine identifier (transform name, tenant slug, identity UUID, JWT preview, JSON keys, attribute names) renders in Geist Mono. Human prose stays in Geist Sans. This split is non-negotiable: it builds an instant signal "this is data the system uses, that the user copies."

**Implicit decisions to preserve.**
- **Drawers are non-modal.** The list behind a drawer stays clickable — users browse and peek without losing place. Drawers are framed by border-left + shadow, not by a darkened backdrop.
- **The tenant pill is always visible** in the topbar. It is the security anchor: admins must always know which tenant they are acting on.
- **Avatar initials are colored** — one warm hue per identity, hashed from the name. This is the only place color escapes the otherwise neutral system and provides a single accent of human warmth.

---

## 2. Color Palette & Roles

All values in `oklch()`. Hex equivalents are computed renderings for reference only.

### Surfaces and foundations

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `oklch(0.985 0 0)` ≈ `#f8f8f8` | `oklch(0.141 ...)` ≈ `#222` | Canvas (body, sidebar, topbar) |
| `--card` | `oklch(1 0 0)` = `#ffffff` | `oklch(0.21 ...)` ≈ `#2c2d31` | Floating surface (cards, popovers, dialogs, drawers, inputs in apps) |
| `--popover` | `oklch(1 0 0)` | `oklch(0.21 ...)` | Same as card — explicit for floating layers |
| `--foreground` | `oklch(0.141 ...)` ≈ `#222` | `oklch(0.985 0 0)` ≈ `#f8f8f8` | Primary text |
| `--muted-foreground` | `oklch(0.552 ...)` | `oklch(0.705 ...)` | Secondary text, captions, "—" placeholder |
| `--border` | `oklch(0.92 ...)` | `oklch(1 0 0 / 10%)` | Subtle dividers, card edges |

### Brand and focus

| Token | Light | Dark | Role |
|---|---|---|---|
| `--primary` | `oklch(0.50 0.20 275)` | `oklch(0.72 0.18 275)` | Primary CTA, focus ring, active sidebar icon, lifecycle current step |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.18 0.04 275)` | Text on primary surface |
| `--ring` | `= --primary` | `= --primary` | Focus ring |

### Semantic tones (Pill palette)

Each tone has a pale background, a saturated foreground, and a matching border in light. In dark, the background is a translucent saturated overlay.

| Tone | Use | Light bg / fg / border | Dark bg / fg / border |
|---|---|---|---|
| `neutral` | Default labels, count badges, "no signal" | `--muted` / `--foreground` / `--border` | (same — vars handle it) |
| `accent` | Type labels, technical chips, drawer title pill | `--primary/10` / `--primary` / `--primary/20` | (same) |
| `success` | Active lifecycle, tenant badge, deploy success | `emerald-50` / `emerald-700` / `emerald-200` | `emerald-950/40` / `emerald-300` / `emerald-900/60` |
| `warning` | Pending correction, locked/built-in, SLA at risk | `amber-50` / `amber-700` / `amber-200` | `amber-950/40` / `amber-300` / `amber-900/60` |
| `danger` | Terminated, aggregation failed, destructive | `rose-50` / `rose-700` / `rose-200` | `rose-950/40` / `rose-300` / `rose-900/60` |
| `info` | Pre-hire, awaiting, neutral notification | `sky-50` / `sky-700` / `sky-200` | `sky-950/40` / `sky-300` / `sky-900/60` |

WCAG AA verified for every foreground/background pair: text contrast ≥ 4.5:1.

**Hard rules.**
- Color is *semantic* outside the accent and tone palette. No decorative emerald or sky.
- No bare Tailwind utilities (`bg-emerald-500`, `text-amber-700`) in app code. Pills, badges, and status indicators go through the closed Pill palette above.

---

## 3. Typography Rules

**Single font stack.** Geist Sans for all human text. Geist Mono for identifiers, IDs, JSON, payload values, and any string the system uses by reference. Never mix in a single span.

Five fixed text classes. No free `text-base`, `text-sm`, `text-xs`, or `text-[Xpx]` in app code.

| Class | Size | Weight | Line | Letter-spacing | Use |
|---|---|---|---|---|---|
| `.si-title` | 24px | 600 | 1.2 | -0.01em | Page title (one per page) |
| `.si-section` | 16px | 600 | 1.3 | — | Card header, section title, drawer title, active tab |
| `.si-body` | 14px | 400 | 1.45 | — | Running text, table cells, descriptions, tab body |
| `.si-caption` | 12px | 500 | 1.4 | — | Filter labels, sub-text under KPIs, count badges, meta |
| `.si-micro` | 11px | 500 | 1.3 | 0.02em | Pills, dense-column timestamps, kbd hints |

**`font-mono` is applied to:** ISC IDs (transform / identity / account / source IDs), tenant slugs, JWT previews, JSON keys and values, transform names (treated as identifiers), payload values inside drawers, environment variable names. **Never** on human-readable prose, button labels, descriptions, or marketing copy.

**Hero exception.** When a surface is the user's first impression (sign-in, empty state, marketing top-band), the page title may scale to 32–40px to carry visual weight. Use this sparingly — at most one hero per page.

---

## 4. Component Stylings

States listed: default → hover → focus → active → disabled.

### Buttons

| Variant | Default | Hover | Focus | Disabled |
|---|---|---|---|---|
| **primary** | `bg-primary text-primary-foreground` | `bg-primary/90` | `ring-2 ring-ring ring-offset-2` | `opacity-50 pointer-events-none` |
| **secondary** | `bg-secondary text-secondary-foreground border` | `bg-secondary/80` | same focus | same |
| **outline** | `bg-card border border-input shadow-sm` | `bg-accent text-accent-foreground` | same focus | same |
| **ghost** | `bg-transparent` | `bg-accent text-accent-foreground` | same focus | same |
| **destructive** | `bg-destructive text-destructive-foreground` | `bg-destructive/90` | same focus | same |

Sizes: `sm` (h-8 px-3 text-xs), `default` (h-9 px-4 text-sm), `lg` (h-10 px-6 text-sm). Icon-only: square `h-X w-X p-0`. All buttons use `rounded-md` and font weight 500.

### Cards

Default: `bg-card border rounded-lg p-4` to `p-6`. Header padding asymmetric (`p-4 pb-2` for title, `p-4 pt-0` for body). No shadow by default (Level 1 — see §6). Shadow-sm only when the card is interactive or grouped on a busy canvas.

### Inputs

`h-9 rounded-md border border-input bg-card px-3 si-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0`. Disabled: `bg-muted opacity-60`. Inputs always `bg-card` — they emerge from the canvas as floating surfaces.

### Pills

`inline-flex items-center si-micro px-2 py-0.5 rounded-md border`. Tone palette closed to the 6 tones in §2. Shape variants: `rounded-md` (default), `rounded-sm` (technical labels like transform types). Modifiers: `mono` (font-mono), `dot` (leading 1.5px tone-matched dot). No borderless variant. No `rounded-full` — that's reserved for avatars and timeline dots.

**Lifecycle state → tone (`<LifecyclePill>`).** Canonical mapping consumed by `apps/web/app/(app)/sailpoint/identities/_components/lifecycle-pill.tsx`. Any lifecycle state not in this table falls back to `neutral` so custom tenant states still render.

| Lifecycle state | Tone | Rationale |
|---|---|---|
| `active` | `success` | Healthy steady state |
| `prehire` | `info` | Awaiting onboarding event (informational, not actionable) |
| `pendingHire` | `warning` | Needs admin attention to complete onboarding |
| `pendingCorrection` | `warning` | Identity flagged for admin correction |
| `pendingReview` | `warning` | Awaiting reviewer action |
| `pendingApproval` | `warning` | Awaiting approver action |
| `pendingDelete` | `warning` | Pending destructive action — review before it lands |
| `inactive` | `warning` | Off-boarded but not terminated — usually transient |
| `suspended` | `warning` | Access paused — admin will resume or terminate |
| `terminated` | `danger` | Terminal state, all access revoked |
| `archived` | `neutral` | Cold storage, no signal |

Rule of thumb: anything starting with `pending` maps to `warning` (the operator is the next actor). `prehire` is the exception — it's a scheduled future event, not a stuck state.

### Tabs

Container: `flex items-center gap-4 border-b -mb-px`. Item: `border-b-2 transition-colors px-3 py-2`. Sizes: `md` (default, `.si-body`, page-level tabs), `sm` (drawer tabs, `.si-caption`, `py-3`). Active: `border-foreground text-foreground`. Inactive: `border-transparent text-muted-foreground hover:text-foreground`. Counts render via inline `<Pill tone="neutral">` after the label, never an ad-hoc badge.

### Drawer (right side panel)

`fixed inset-y-0 right-0 bg-card border-l shadow-[var(--si-shadow-3)] w-[520px]` (md). Sizes: `md` (~520px), `lg` (~760px), `xl` (full-screen on mobile). **Non-modal:** no scrim, the list behind remains visible and clickable. Border-left + Level 3 shadow are the only signals that the drawer floats above the canvas. Header: `border-b px-5 py-4`, title in `.si-section` (override to `font-mono` for transforms), close button (`X` icon, `h-7 w-7`, hover muted) owned by the primitive. Body: `flex-1 overflow-auto px-5 py-4` — children render without their own scroll container.

### Dialog (modal)

`bg-card border rounded-lg shadow-[var(--si-shadow-4)] p-6 max-w-lg`. Modal: backdrop `bg-foreground/40` blur(2px). Header `.si-section`, body `.si-body`, footer right-aligned button row with `gap-2`.

### Avatar initials

Circle `rounded-full`, sizes `sm` (h-6 w-6 text-xs), `md` (h-8 w-8 text-sm), `lg` (h-12 w-12 text-base). Background color hashed from name into a warm palette (peach / sand / coral / olive / dusk / sage). Text always `text-white` weight 500. The only place color escapes the neutral + semantic system.

### Data table

Sticky header `bg-card border-b`. Row hover `bg-[var(--si-row-hover)]`. Cells `.si-body px-3 py-2` (dense) or `py-3` (comfortable). Sort icons unified: `ArrowUpDown → ArrowUp → ArrowDown`. Row click → navigation (cursor-pointer when row has href). See §8 for mobile collapse strategy.

### Status dots

Used in timelines, lifecycle visualizations, recent-activity feeds. `h-2.5 w-2.5 rounded-full border-2`. Tones drawn from the Pill palette: `success` (done), `accent` (current — indigo), `neutral` (pending), `warning` / `danger` (alerts).

---

## 5. Layout Principles

**Content width — fills the viewport.** The page chrome takes the **full width** available next to the sidebar. No `max-width`, no `mx-auto`. Cards and grids inside the page (`grid grid-cols-N`) absorb the extra horizontal space naturally as they stretch. On ultra-wide screens, KPI cards and table columns get more breathing room rather than getting orphaned by centering whitespace. Below `lg` (1024px), the same shell still applies — content expands to viewport minus the 24px padding gutter.

**Page chrome.** `w-full px-6 py-5`. Pages don't manage their own width — they're always wrapped in a shell that imposes it.

**Vertical rhythm.** A small fixed scale: `gap-3` (12px) inside dense rows, `gap-4` (16px) between major blocks (KPI strip → filter bar → table), `gap-5` (20px) below headers, `gap-8` (32px) between page-level sections. Never invent intermediate values.

**Sidebar.** Persistent left rail at **240px** (`15rem`) on desktop, 64px collapsed, hidden under hamburger below `md`. Same background as canvas (no chrome, **no border-right**). The fixed pane has `p-2` so its content gets 8px breathing room from the viewport edge — the sidebar never flushes against the screen. Active items emerge as white `bg-card` surfaces with `shadow-sm` and the icon in `text-primary`. No solid-fill highlight.

**Topbar.** Sits on canvas, no background of its own, **no border-bottom**. The continuous canvas flows directly into the page header below. Holds breadcrumbs (left), tenant pill, help / notification icons (right). Always 48px tall.

**Page header.** Title (`.si-title`) + description (`.si-body text-muted-foreground`) + action row (right-aligned, `gap-2`). **No border-bottom** — only a small `pb-2` separation before the page body. The body follows after `pt-5`. The visual hierarchy comes from the title size and the spacing, not from a divider line.

**Detail header.** Back link (`-ml-2 mb-3`) + avatar (48px, left) + title/subtitle/badges (middle) + actions (right). Same convention as page header — **no border-bottom**, only spacing. Optional inline stat strip below with `pt-4`. Tabs below stats with `pt-4`. Body after with `pt-4`.

---

## 6. Depth & Elevation

Five levels. Each level has a defined surface, shadow, and use.

| # | Surface | Shadow (light) | Shadow (dark) | Use |
|---|---|---|---|---|
| 0 | `bg-background` | none | none | Canvas — the body, sidebar, topbar |
| 1 | `bg-card border` | none | none | Stationary card (KPI, profile section, lifecycle card) |
| 2 | `bg-popover border` | `--si-shadow-1` | `--si-shadow-1` + visible border | Dropdown, popover, kebab menu, sidebar active item |
| 3 | `bg-card border-l` | `--si-shadow-3` | `--si-shadow-3` + `border-l-foreground/15` | Drawer (right side panel) |
| 4 | `bg-card border` | `--si-shadow-4` | `--si-shadow-4` + `border-foreground/12` | Modal, dialog, command palette |

**Dark mode pairs shadow with border.** Shadows alone don't carry in dark — every elevated surface adds a subtle border to reinforce its edge. Drawer in particular: never rely on shadow alone in dark.

**Backdrop rule.** Levels 2 and 3 are non-modal — no scrim, the canvas below remains active. Level 4 is modal — backdrop `bg-foreground/40 backdrop-blur-sm`.

---

## 7. Do's & Don'ts

**Do.**
- Use the 5 typography classes (`.si-title|section|body|caption|micro`) for all text. Add new classes only when an existing one objectively fails — never to win a single pixel.
- Use the closed Pill tone palette (6 tones) for every status, type, or risk label.
- Use `bg-card` for any surface that should emerge from the canvas (cards, inputs, dialogs, drawer, popover).
- Use `--si-shadow-N` tokens for elevation, never raw `shadow-*` Tailwind utilities.
- Use `font-mono` for every machine identifier — and only for those.

**Don't.**
- Hardcode `bg-emerald-*`, `bg-amber-*`, `bg-rose-*`, `bg-sky-*` in app code. Pills, StateView, and StatGroup tones handle semantic color.
- Use `bg-white` directly. Use `bg-card`.
- Use `bg-background` for anything other than canvas (body, sidebar, topbar). All other surfaces are `bg-card`.
- Render a floating surface (dialog, popover, drawer) without a backdrop or an explicit border in dark mode.
- Render a stat / KPI cell with value "—" without an alternative copy ("Unassigned", "No data yet"). An empty cell signals failure.
- Show "Coming Soon" as a card status on the dashboard. Either show an informative roadmap card (with stats and a target quarter) or hide the entry until shipped.
- Inline a tab implementation. Use the Tabs primitive.
- Hardcode pagination chrome. Use the Pagination primitive.

---

## 8. Responsive Behavior

| Breakpoint | Tables | KPI / Stats | Sidebar |
|---|---|---|---|
| `< 640px` (mobile) | Card view: each row is a card with primary identifier, 2–3 essential stats, row kebab menu. Hidden columns surface via row tap → detail page. | `grid-cols-1` or `grid-cols-2`, generous padding | Hidden, accessed via hamburger. User avatar lives in the topbar, not floating in the canvas. |
| `640–1024px` (tablet) | Table with optional columns hidden (priority order). Header sticky. | `grid-cols-2` | Overlay (not persistent), opens on toggle |
| `≥ 1024px` (desktop) | Full table, all columns. Density `dense` (py-2). | `grid-cols-3` or `grid-cols-4` | Persistent 256px (or 64px collapsed) |

**Touch targets.** 44px minimum hit area on mobile. Buttons grow from `h-8`/`h-9` to `h-10` below `sm`. Row kebab menu trigger grows from `h-7 w-7` to `h-10 w-10`.

**Inline stat strip auto-collapses.** A `<StatGroup layout="inline">` falls back to `grid grid-cols-2` below `sm` to avoid 4 cells of 90px each. Cell dividers are dropped in collapsed mode and replaced by card borders.

**No horizontal scroll** at any breakpoint. A table that doesn't fit becomes cards. A drawer at `xl` becomes full-screen below `md`.

---

## 9. Agent Prompt Guide

Quick color reference (copy into your prompt):

```
Brand indigo:        oklch(0.50 0.20 275)  — primary CTA, focus ring, active sidebar icon
Canvas:              oklch(0.985 0 0)      — body / sidebar / topbar
Surface (card):      oklch(1 0 0)          — floating cards, popovers, dialogs, drawer, inputs
Foreground:          oklch(0.141 0.005 285.823)
Muted foreground:    oklch(0.552 0.016 285.938)
Border:              oklch(0.92 0.004 286.32)
Success:             emerald-50 / emerald-700 / emerald-200
Warning:             amber-50  / amber-700  / amber-200
Danger:              rose-50   / rose-700   / rose-200
Info:                sky-50    / sky-700    / sky-200
```

Ready-to-paste prompts:

- *"Build me a list page for `<entity>` using a top KPI strip (4 cells, grid layout, neutral tone), a filter bar (search + 2 dropdowns with hrefFor URL state), and a dense data table with sort and pagination. Use canvas-first surfaces: body / sidebar on `--background`, all cards and inputs on `--card`. Single accent indigo only on the primary CTA and the active sidebar icon."*

- *"Build me a detail page for `<entity>` using a back link (-ml-2 mb-3), a header row (avatar 48px + title `.si-title` + subtitle `.si-body text-muted-foreground` + status pill + right-aligned actions), an inline 4-cell stat strip, tabs (Overview / Accounts / Entitlements / Attributes) using hrefFor URL state, and a body card per tab."*

- *"Build me a right-side drawer for `<entity>`. Non-modal: no backdrop, the list behind remains clickable. Header with border-b, title in `font-mono` if the entity is identified by code, type pill beside, meta line in `.si-caption text-muted-foreground` with `·` separators. Tabs in `sm` size for drawer-internal sections. Body owns its own scroll. Width 520px on md, full-screen below md. Add Level 3 shadow (`--si-shadow-3`) + `border-l` so it floats above the canvas."*

- *"Build me a dashboard hero: hero title 'Welcome back, `<name>`.' in 32px Geist Sans 700, then a contextual subtitle in `.si-body text-muted-foreground` describing 1–2 things that need attention. KPI strip in 4 cards (Identities total / Sources health / Transforms in use / Risk count) with trend or status sub-text. Two-column section below: Recent activity (5 events, semantic dot tone, `event-cta` button per event) and Quick actions (4 items, indigo soft icon)."*

- *"Build me a 'Coming Soon' module card the right way: informative roadmap card with target quarter (`Q3 2026` / `Q4 2026` / `Preview`), 1–2 line description of what's coming, and 3 expected stats. The card has the same surface, border, and shadow treatment as a live module — only the status pill and the link target differ."*

- *"Build me an empty state at page level: centered vertical layout, icon-square 40px tinted with the intent tone (empty=neutral, not_connected=accent, auth_failed=accent, api_error=danger, forbidden=warning, coming-soon=accent), title `.si-section`, description `.si-body text-muted-foreground` max-width 28rem, optional primary action below. No card border — the page already provides the container."*

- *"Render a status indicator for a SailPoint identity lifecycle state. Map: `active` → success, `prehire` → info, `pendingCorrection` → warning, `inactive` → warning, `suspended` → warning, `terminated` → danger, `archived` → neutral. Use the Pill primitive with the corresponding tone."*

---

## References

- **Adopted visual baseline (2026-05-13):** `vault/Projects/Simplified Identity/2026-05-13-design-mockup-dashboard-v2-si.html` (private Obsidian vault)
- **Architecture decision record:** `vault/Projects/Simplified Identity/2026-05-13-design-md-stitch-format.md`
- **Stitch format reference:** https://stitch.withgoogle.com/docs/design-md/overview/
- **Live token source of truth:** `apps/web/app/globals.css`
