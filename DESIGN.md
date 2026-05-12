# DESIGN.md — Simplified Identity Visual System

> **Status:** v1 (active) — last updated 2026-05-12
> **ADR (decisions & rationale):** `vault/Projects/Simplified Identity/2026-05-12-visual-identity-v1.md` (Anas's private Obsidian vault)
> **Audience:** developers writing UI code in this repo. This document is the operational reference. When in doubt, this file decides — and if it conflicts with the ADR, fix this file.

The visual system is **admin-native**, inspired by Linear, Vercel Dashboard, Stripe Dashboard, and Plaid Dashboard. It is dense, neutral, disciplined. One accent color (indigo) carries the brand, the primary action, and the focus ring. Color elsewhere is **semantic** — reserved for status, risk, error, success. Type drives hierarchy; chrome doesn't.

---

## Quick reference — "which primitive do I use?"

| You want to render… | Use | NOT |
|---|---|---|
| A page title + description + actions, then a list | `<PageShell>` | a hand-rolled `<div className="mx-auto max-w-...">` |
| A detail page (back + header + stats + tabs + body) | `<DetailShell>` | a hand-rolled layout |
| A list/grid of rows with sort + pagination + bulk + kebab | `<DataTable>` | shadcn `<Table>` directly in a page |
| A status / type / tenant / risk label | `<Pill tone="...">` | hardcoded `bg-emerald-*`, `bg-amber-*`, etc. |
| A tabbed nav (page or drawer) | `<Tabs>` | inline `border-b-2` link styling |
| A right-side detail panel | `<Drawer>` | shadcn `<Sheet>` directly |
| Empty / 403 / 401 / API error / not connected | `<StateView>` | `<Card>` + custom copy each time |
| KPI cards or detail-header stats | `<StatGroup>` | hand-rolled `<div className="grid grid-cols-4 gap-3">` |
| A search + filter dropdowns row | `<FilterBar>` + `<FilterDropdown>` | per-page filter components |
| Page-size + page-numbers footer | `<Pagination>` | duplicated footer chrome per table |
| Row kebab menu | `<RowActions>` | inline `<DropdownMenu>` + `<MoreHorizontal>` |
| A short id / token / type / tenant slug | `font-mono` (Geist Mono) | regular sans |

---

## 1. Tokens (`apps/web/app/globals.css`)

### 1.1 Colors

Stock shadcn neutrals are preserved (`--background`, `--muted`, `--border`, `--card`, etc.). Only the following are re-pointed:

```css
:root {
  --primary: oklch(0.50 0.20 275);          /* indigo accent */
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.50 0.20 275);             /* focus follows accent */
  --sidebar-primary: oklch(0.50 0.20 275);  /* active sidebar item */

  --si-row-hover: var(--muted);
  --si-content-max: 1400px;
}

.dark {
  --primary: oklch(0.72 0.18 275);
  --primary-foreground: oklch(0.18 0.04 275);
  --ring: oklch(0.72 0.18 275);
  --sidebar-primary: oklch(0.72 0.18 275);
}
```

**Why indigo:** distinct from the SailPoint enterprise-blue (~250 hue), reads as "serious tech tool" without being a SaaS-generic teal. WCAG AA verified ≥ 4.5:1 against `--primary-foreground`.

### 1.2 Typography

Single font stack: **Geist Sans** for everything, **Geist Mono** for IDs, tokens, transform names, JSON, tenant slugs. Both already loaded via `next/font/google` in `app/layout.tsx`.

Five fixed text classes, declared in `globals.css` under `@layer components`:

```css
@layer components {
  .si-title    { font: 600 24px/1.2 var(--font-geist-sans); letter-spacing: -0.01em; }
  .si-section  { font: 600 16px/1.3 var(--font-geist-sans); }
  .si-body     { font: 400 14px/1.45 var(--font-geist-sans); }
  .si-caption  { font: 500 12px/1.4  var(--font-geist-sans); }
  .si-micro    { font: 500 11px/1.3  var(--font-geist-sans); letter-spacing: 0.02em; }
}
```

| Class | Size | Weight | Usage |
|---|---|---|---|
| `.si-title` | 24px | 600 | Page title (one per page) |
| `.si-section` | 16px | 600 | Section title, Card header, Drawer title, active tab |
| `.si-body` | 14px | 400 | Running text, table cells, descriptions, tab body |
| `.si-caption` | 12px | 500 | Filter labels, sub-text under KPIs, count badges |
| `.si-micro` | 11px | 500 | Pills, dense-column timestamps |

`font-mono` is applied to: ISC IDs (transform/identity/account ID), tenant slug, JWT preview, JSON keys/values, payload values inside drawers, transform names (treated as identifiers). **Never** on human text.

### 1.3 Spacing & radius

Stock Tailwind. Standard rhythm inside pages: `space-y-4` between major blocks (KPI strip → filter bar → table), `pt-4` after a header border. Radius: `rounded-md` is the default everywhere except `<AvatarInitials>` (full) and the brand mark (`rounded-md` / `rounded-[10px]` depending on size).

---

## 2. Primitives

### 2.1 `<PageShell>` — list/dashboard pages

**File:** `apps/web/app/(app)/_components/page-shell.tsx`
**Replaces:** `<PageHeader>`, `<ComingSoon>`, and every hand-rolled `mx-auto max-w-Xxl px-6 py-6` wrapper.

```tsx
<PageShell
  title="Identities"
  description="Unified workforce identities across all connected sources."
  actions={<><ExportCsvButton /><BulkProcessButton /></>}
  status="ready"  // 'ready' (default) | 'coming-soon'
>
  <StatGroup ... />
  <FilterBar ... />
  <DataTable ... />
</PageShell>
```

**Spec:**

- Container: `w-full max-w-[var(--si-content-max)] mx-auto px-6 py-5`. One width for every list page.
- Header: title `.si-title`, description `.si-body text-muted-foreground`, actions right-aligned `gap-2`. Border-bottom `pb-4`.
- Vertical gap between header and children: `pt-5`. Children manage their own rhythm.
- `status="coming-soon"` renders a `<StateView intent="coming-soon">` in place of children.

### 2.2 `<DetailShell>` — entity detail pages

**File:** `apps/web/app/(app)/_components/detail-shell.tsx`
**Replaces:** the two incompatible detail shells (identity full-width custom, transform `max-w-4xl` flat).

```tsx
<DetailShell
  back={{ href: '/identities', label: 'All identities' }}
  header={
    <DetailHeader
      avatar={<AvatarInitials name={identity.displayName} size="lg" />}
      title={identity.displayName}
      subtitle={identity.email}
      badges={[
        <LifecyclePill state={identity.lifecycleState?.stateName} />,
        <RiskPill value={risk} />,
      ]}
      actions={<ProcessIdentityButton id={identity.id} />}
    />
  }
  stats={<StatGroup layout="inline" items={...} />}  // optional
  tabs={<Tabs hrefFor={(k) => `?tab=${k}`} value={tab} items={...} />}
>
  {/* body of the current tab */}
</DetailShell>
```

**Spec:**

- Same container as `<PageShell>` (`max-w-[var(--si-content-max)]`). Lists and details share one width.
- Back: `<Button variant="ghost" size="sm">` with `<ArrowLeft />`, posed `-ml-2 mb-3`.
- Header: avatar left (48px), title/subtitle/badges middle, actions right. `gap-4`. Border-bottom `pb-4`.
- Stats: `pt-4`. Optional — slot collapses cleanly when absent.
- Tabs: `pt-4`. Border-bottom of `<Tabs>` doubles as separator with body.
- Body: `pt-4`.

**Symmetry rule:** transform detail page and transform drawer share the same tabs (Configuration / JSON / Tree / Usages) so the same transform reads the same in both contexts.

### 2.3 `<DataTable>` — list tables

**File:** `apps/web/components/ui/data-table.tsx`
**Replaces:** `identities-table.tsx` and `transforms-table.tsx` rolling their own header/footer/pagination/bulk-action bars. Closes vault issue #48.

```tsx
<DataTable
  columns={columns}              // ColumnDef<T>[] from @tanstack/react-table
  data={rows}
  rowKey={(r) => r.id}
  density="dense"                // 'dense' (default) | 'comfortable'
  rowHref={(row) => `/identities/${row.id}`}  // makes row clickable
  rowActions={(row) => <RowActions items={...} />}
  selection                      // adds checkbox column
  bulkActions={(selected) => <BulkActions ids={selected} />}
  emptyState={<StateView intent="empty" size="sm" />}
  errorState={errorResult ? <StateView intent={errorResult.kind} size="sm" /> : undefined}
  pagination={<Pagination ... />}
/>
```

**Spec:**

- Header sticky, sort icons unified: `ArrowUpDown` → `ArrowUp` → `ArrowDown`.
- Checkbox column rendered when `selection` is true. Bulk action bar floats above the table when at least one row is selected.
- Row hover: `bg-[var(--si-row-hover)]`. Cursor pointer when `rowHref` is provided.
- Density `dense`: `py-2` cells, `.si-body`. Density `comfortable`: `py-3` cells. Toggle is internal per call-site (no user toggle in v1).
- Empty/error states delegate to `<StateView>`. Pagination delegates to `<Pagination>`.

**Standard cells**, importable from `apps/web/components/cells/`:

```tsx
<IdCell value={transform.id} mono />                        // mono + copy tooltip
<TimestampCell value={identity.modified} mode="relative" /> // "2 hrs ago" / "Yesterday" / "Mar 12, 2026"
<PrincipalCell name={identity.displayName} email={identity.email} avatar />
```

### 2.4 `<Pill>` — status / type / risk labels

**File:** `apps/web/components/ui/pill.tsx`
**Replaces:** `<StatusDot>`, `<LifecyclePill>` body, `<RiskPill>` body, `<TenantPill>`, `<TypePill>` body, inline `<StatusPill>` in `accounts-tab.tsx`.

```tsx
<Pill
  tone="neutral|accent|success|warning|danger|info"
  shape="rounded|square"  // rounded-md (default) | rounded-sm (technical labels)
  mono                    // optional: font-mono
  dot                     // optional: leading 1.5px tone-matched dot
>
  {label}
</Pill>
```

**Tone palette (closed — no other tones allowed):**

| Tone | Light | Dark |
|---|---|---|
| `neutral` | `bg-muted text-foreground border-border` | (same, vars handle it) |
| `accent` | `bg-primary/10 text-primary border-primary/20` | (same) |
| `success` | `bg-emerald-50 text-emerald-700 border-emerald-200` | `bg-emerald-950/40 text-emerald-300 border-emerald-900/60` |
| `warning` | `bg-amber-50 text-amber-700 border-amber-200` | `bg-amber-950/40 text-amber-300 border-amber-900/60` |
| `danger` | `bg-rose-50 text-rose-700 border-rose-200` | `bg-rose-950/40 text-rose-300 border-rose-900/60` |
| `info` | `bg-sky-50 text-sky-700 border-sky-200` | `bg-sky-950/40 text-sky-300 border-sky-900/60` |

**Always `.si-micro` size, always `px-2 py-0.5`, always `border` (no borderless variant).**

**Domain wrappers** (3–5 line files each, located beside the consumer) map domain state to `tone` and delegate:

```tsx
// app/(app)/identities/_components/lifecycle-pill.tsx
const TONE: Record<string, ToneOf<Pill>> = {
  active: 'success',
  inactive: 'warning',
  prehire: 'info',
  suspended: 'warning',
  terminated: 'danger',
};
export function LifecyclePill({ state }: { state?: string | null }) {
  if (!state) return <span className="text-muted-foreground/50">—</span>;
  return <Pill tone={TONE[state.toLowerCase()] ?? 'neutral'}>{state}</Pill>;
}
```

Same pattern for `RiskPill` (low/medium → success/warning, high/critical → danger), `AccountStatusPill` (locked → danger, disabled → warning, default → success), `TenantPill` (always `tone="success" mono dot`).

**TypePill collapse:** all transform types render as `<Pill tone="accent" mono shape="square">{type}</Pill>`. The label *is* the distinguishing signal — the 8-tone palette previously in use was never published and didn't help readers. Revisit if 4-week usage shows pain.

### 2.5 `<Tabs>` — page tabs and drawer tabs

**File:** `apps/web/components/ui/tabs.tsx`
**Replaces:** `<ViewTabs>`, the inline `<TabLink>` in `app/(app)/identities/[id]/page.tsx`, the inline `<DrawerTab>` in `transform-drawer.tsx`.

```tsx
<Tabs
  size="md"             // 'md' (default — page-level) | 'sm' (drawer)
  value={active}
  hrefFor={(k) => `?tab=${k}`}    // for nav-style tabs (server, browser-history)
  onValueChange={setTab}          // OR controlled state (transient, drawer-style)
  items={[
    { key: 'overview', label: 'Overview' },
    { key: 'accounts', label: 'Accounts', count: 12 },
    { key: 'attributes', label: 'Attributes' },
  ]}
/>
```

**Spec:**

- Container: `flex items-center gap-4 border-b -mb-px`.
- Item: `border-b-2 transition-colors px-3 py-2` (md) or `py-3` (sm). Active: `border-foreground text-foreground`. Inactive: `border-transparent text-muted-foreground hover:text-foreground`.
- Typography: `.si-body` (md), `.si-caption` (sm).
- `count` renders an internal `<Pill tone="neutral">{count}</Pill>` after the label. No ad-hoc count-badge.
- `hrefFor` and `onValueChange` are **mutually exclusive**. `hrefFor` produces `<Link>` (server, URL-state). `onValueChange` produces `<button>` (transient client state).

**When to use which mode:**

- Identity detail tabs (overview/accounts/entitlements/attributes) → `hrefFor` (URL-state, deep-linkable, back button works).
- Transform drawer tabs (configuration/usage/test/json/tree) → `onValueChange` (the drawer itself is URL-controlled via `?selected=` — tab state would be noise in the URL).

### 2.6 `<Drawer>` — right-side detail panel

**File:** `apps/web/components/ui/drawer.tsx`
**Replaces:** raw `<Sheet>` usage with ad-hoc header chrome in `transform-drawer.tsx`.

```tsx
<Drawer
  open={open}
  onOpenChange={setOpen}
  side="right"
  size="md"     // 'md' (~520px) | 'lg' (~760px) | 'xl' (full-screen on mobile)
  header={
    <DrawerHeader
      title={<span className="font-mono">{transform.name}</span>}
      titleBadge={<Pill tone="accent" mono shape="square">{transform.type}</Pill>}
      meta={[
        { label: group.label },
        { label: `${usageCount} usage${usageCount === 1 ? '' : 's'}` },
        { label: 'Built-in', emphasis: true, icon: <Lock /> },
      ]}
      actions={<EditButton id={transform.id} disabled={isBuiltin} />}
    />
  }
  tabs={<Tabs size="sm" onValueChange={setTab} value={tab} items={TABS} />}
>
  {/* body — Drawer owns the scroll, children don't add overflow-auto */}
</Drawer>
```

**Spec:**

- Built on top of shadcn `<Sheet>` (Radix Dialog underneath).
- `<DrawerHeader>` renders: `border-b px-5 py-4`. Title is `.si-section` (override via `<span className="font-mono">` for transforms). Badges sit beside title. Meta line is `.si-caption text-muted-foreground` with `·` separators. Emphasis items: `text-foreground font-medium`.
- Close button (`X` icon, h-7 w-7, hover muted) is owned by `<Drawer>`. Don't render one yourself.
- Tabs slot is optional; when present it renders directly under the header with `px-5`.
- Body: `flex-1 overflow-auto px-5 py-4`. Children render their content without adding scroll containers.

### 2.7 `<StateView>` — empty / error / forbidden / coming-soon

**File:** `apps/web/components/ui/state-view.tsx`
**Replaces:** `<SailpointEmptyState>`, inline `<PermissionDenied>` and `<TabFailure>` in identity detail, empty-state inline in `accounts-tab.tsx`, empty-state in DataTable.

```tsx
<StateView
  intent="empty"       // 'empty' | 'not_connected' | 'auth_failed' | 'api_error' | 'forbidden' | 'coming-soon'
  icon={<Anchor />}    // optional, intent provides default
  title="No identities have been aggregated yet"
  description="Run an aggregation on a connected source to populate this view."
  detail="403 forbidden — ask an admin to grant idn:identities:read"  // optional, rendered in mono caption
  action={<Button asChild><Link href="/sources">Go to sources</Link></Button>}
  size="md"            // 'sm' (in-tab, in-table) | 'md' (page-level)
/>
```

**Spec by size:**

- `size="md"` — page-level: centered vertical layout, icon-square 40px tinted via tone, title `.si-section`, description `.si-body text-muted-foreground`, max-width `28rem`, `py-12`. No card border (the page already provides container).
- `size="sm"` — in-context (inside a tab, a table, a card): compact layout, optional icon, `border border-dashed rounded-md py-6 px-4`, `.si-body text-muted-foreground`. Tone borrowed from `intent`.

**Intent → tone & default copy mapping:**

| Intent | Tone | Default icon | Default action |
|---|---|---|---|
| `empty` | neutral | none | none |
| `not_connected` | accent | `<Anchor />` | "Sign in with SailPoint" → `/sign-in` |
| `auth_failed` | accent | `<KeyRound />` | "Sign in again" → `/sign-in` |
| `api_error` | danger | `<AlertTriangle />` | "Back to dashboard" → `/dashboard` |
| `forbidden` | warning | `<ShieldOff />` | none (informational) |
| `coming-soon` | accent | `<Sparkles />` | "Back to dashboard" → `/dashboard` |

### 2.8 `<StatGroup>` — KPI row / detail-header stats

**File:** `apps/web/components/ui/stat-group.tsx`
**Replaces:** `<IdentityKpiStrip>` (4 cards in grid), `<IdentityStatsStrip>` (cells with vertical dividers).

```tsx
<StatGroup
  layout="grid"  // 'grid' (page-level KPI strip) | 'inline' (detail-header companion)
  items={[
    { label: 'Total identities', value: 1248, sub: '1100 active · 148 pending', href: '/identities' },
    { label: 'External / contractors', value: 89, sub: '7% of workforce' },
    { label: 'Risk', value: 12, sub: 'Review recommended', tone: 'danger' },
    { label: 'Awaiting onboarding', value: 7, sub: 'Preboard lifecycle state' },
  ]}
/>
```

**Spec:**

- `layout="grid"`: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`. Each cell `rounded-lg border bg-card p-4`. Label `.si-caption uppercase tracking-wider text-muted-foreground`. Value `text-3xl font-semibold tabular-nums`. Sub `.si-caption text-muted-foreground`.
- `layout="inline"`: one container `flex divide-x rounded-lg border bg-card`. Each cell `flex-1 px-5 py-4`. Same typography. **No `tone`** in inline layout (semantics carried by the value, not the background).
- `tone="danger"` in grid: re-tints border `border-rose-200` + bg `bg-rose-50/60` (dark counterparts). Used for Risk-like alerting cards.
- `tone="warning"` in grid: same pattern with amber. Reserved for "soft heads-up". (The previous Identity KPI used `warning` for high-risk — convention says high-risk is `danger`.)
- `href` makes the cell clickable, hover state `hover:border-foreground/30` (grid) or `hover:bg-muted/40` (inline).

### 2.9 `<FilterBar>` + `<FilterDropdown>` — filter row

**File:** `apps/web/components/ui/filter-bar.tsx`, `filter-dropdown.tsx`
**Replaces:** `<ProfileFilter>`, `<LcsFilter>`, `<DepartmentFilter>`, `<RiskFilter>`, `<TypeFilter>`, `<GroupFilter>`, `<InternalFilter>` — seven ad-hoc filter components.

```tsx
<FilterBar
  search={<SearchBox initial={q} placeholder="Search identities..." />}
  filters={[
    <FilterDropdown
      key="profile"
      label="Type"
      value={profile}
      options={profiles.map((p) => ({ value: p.id, label: p.name }))}
      hrefFor={(v) => buildHref({ profile: v })}
    />,
    <FilterDropdown
      key="lcs"
      label="Status"
      value={lcs}
      options={LCS_OPTIONS}
      hrefFor={(v) => buildHref({ lcs: v })}
    />,
    <FilterDropdown
      key="department"
      label="Department"
      value={department}
      mode="combobox"
      onSelect={(v) => router.push(buildHref({ department: v }))}
    />,
    riskAvailable && (
      <FilterDropdown
        key="risk"
        label="Risk"
        value={risk}
        options={RISK_OPTIONS}
        hrefFor={(v) => buildHref({ risk: v })}
      />
    ),
  ]}
  clearHref={hasAnyFilter ? '/identities' : undefined}
/>
```

**Spec:**

- `<FilterBar>`: `flex flex-wrap items-center gap-2`. Renders `clearHref` as a `<Button variant="ghost" size="sm">Clear filters</Button>` when defined.
- `<FilterDropdown>`: `<Button variant="outline" size="sm">` with chevron and label. When `value` is defined, the button gets `border-primary/40 bg-primary/5 text-primary` (active-filter signal). Dropdown content via shadcn `<DropdownMenu>`.
- Single-value only in v1. No multi-select, no operators.
- `mode="combobox"` (free-text + suggestions) is a separate variant for fields like Department where the option set is too large to enumerate.

### 2.10 `<Pagination>` — page-size + page-numbers footer

**File:** `apps/web/components/ui/pagination.tsx`
**Replaces:** the duplicated footer in identities-table and transforms-table.

```tsx
<Pagination
  page={page}
  totalPages={totalPages}
  total={total}
  rangeStart={rangeStart}
  rangeEnd={rangeEnd}
  perPage={per}
  perPageOptions={[25, 50, 100, 250]}
  hrefFor={(p, perValue) => buildHref({ page: p, per: perValue, ...rest })}
/>
```

**Spec:**

- Layout: `flex items-center justify-between gap-4 pt-3 border-t`.
- Left: `<span className=".si-caption text-muted-foreground">Showing {start}–{end} of {total}</span>` + per-page dropdown (`<Button variant="outline" size="sm">` + shadcn `<DropdownMenu>`).
- Right: page numbers with ellipsis. Active page `inline-flex h-8 min-w-8 rounded-md bg-foreground text-background`. Inactive `hover:bg-accent text-foreground`. Prev/Next: `<Button variant="ghost" size="sm">` with chevrons.

### 2.11 `<RowActions>` — kebab menu

**File:** `apps/web/components/ui/row-actions.tsx`
**Replaces:** `<RowActions>` (transforms), `<RowMenu>` (identities), `<AccountRowActions>` (accounts).

```tsx
<RowActions
  label={`Actions for ${row.name}`}
  items={[
    { label: 'View detail', href: `/identities/${row.id}` },
    { label: 'Process this identity', icon: <RefreshCw />, onSelect: onProcess, pending },
    { label: 'Copy id', onSelect: () => navigator.clipboard?.writeText(row.id) },
    { divider: true },
    { label: 'Delete', tone: 'danger', onSelect: () => setDeleteOpen(true) },
  ]}
/>
```

**Spec:**

- Trigger: `<Button variant="ghost" size="icon">` with `<MoreHorizontal />`. Fixed `h-7 w-7` (dense row height).
- When any item has `pending: true`, the trigger icon swaps to `<Loader2 className="animate-spin" />`.
- `tone="danger"` on an item: `text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40`.
- `divider: true` renders a `<DropdownMenuSeparator />`.
- Dialogs (Delete, Duplicate, etc.) are mounted by the caller — `<RowActions>` only triggers via `onSelect`. Pattern: keep `useState` for the dialog beside `<RowActions>`, the menu item calls `setOpen(true)`.

### 2.12 `<TimelineDot>` — small status dots in timelines

**File:** local to `app/(app)/identities/_components/identity-lifecycle-card.tsx` (not exported — promote when reused).
**Replaces:** hardcoded `emerald-500` + `sky-500` in `<IdentityLifecycleCard>`.

```tsx
<TimelineDot tone="success" />   // done step
<TimelineDot tone="accent" />    // current step
<TimelineDot tone="neutral" />   // pending step
```

`h-2.5 w-2.5 rounded-full border-2` with tone-matched border + bg drawn from the `<Pill>` palette. When a second consumer appears, promote to `components/ui/timeline-dot.tsx`.

---

## 3. Banned patterns

In `apps/web/app/(app)/**` and `apps/web/app/(auth)/**`:

- ❌ Free `text-base`, `text-sm`, `text-xs`, `text-[Xpx]` — use `.si-title|section|body|caption|micro`.
  - Exception: `components/ui/**` (shadcn primitives) keep their default classes. We don't re-skin shadcn primitives themselves.
- ❌ Hardcoded `bg-emerald-*`, `bg-amber-*`, `bg-rose-*`, `bg-sky-*` — use `<Pill>`, `<StateView>`, or `<StatGroup tone>`.
- ❌ Free `max-w-2xl`, `max-w-4xl`, `max-w-6xl` in a page — use `<PageShell>` / `<DetailShell>` (they enforce `--si-content-max`) or `<StateView size>` for inner containers.
- ❌ `rounded-full` on badges/pills — `<Pill>` is `rounded-md`. Allowed for `<AvatarInitials>` and timeline dots.
- ❌ Inline `border-b-2 border-foreground` to render a tab — use `<Tabs>`.
- ❌ Using `<Table>` shadcn directly in a list page — use `<DataTable>`.
- ❌ Using `<Sheet>` shadcn directly in a product surface — use `<Drawer>`.
- ❌ Inline `<MoreHorizontal />` + `<DropdownMenu>` for a row kebab — use `<RowActions>`.
- ❌ Hand-rolled empty / error / "no permission" copy in a Card — use `<StateView>`.
- ❌ Hand-rolled pagination footer — use `<Pagination>`.

Optional lint rule (planned, PR-9): a custom eslint rule in `apps/web/.eslintrc` enforces the above bans on file paths matching `app/(app|auth)/**/*.tsx`.

---

## 4. Migration status

Each row is one PR. Status: `todo` / `in-progress` / `done`.

| PR | Title | Status |
|---|---|---|
| 1 | Tokens + typo classes + `<PageShell>` | todo |
| 2 | `<Pill>` + retire 6 legacy pill systems | todo |
| 3 | `<Tabs>` + retire 3 ad-hoc tab implementations | todo |
| 4 | `<StateView>` + retire 4 empty/error styles | todo |
| 5 | `<RowActions>` + `<Pagination>` + `<FilterBar>` / `<FilterDropdown>` | todo |
| 6 | `<DataTable>` + migrate identities table (refs vault #48) | todo |
| 7 | Migrate transforms table to `<DataTable>` (closes vault #48) | todo |
| 8 | `<Drawer>` + `<DetailShell>` + `<StatGroup>` + detail-page re-architecture | todo |
| 9 (opt) | eslint rule banning regressed patterns | todo |

Update the row to `done` when its PR merges. When all rows are `done`, this section becomes a static reference and the legacy components in the table below are confirmed deleted.

### Legacy components to delete by end of v1

| Component | Replaced by | Removed in |
|---|---|---|
| `app/(app)/_components/page-header.tsx` | `<PageShell>` (internal header) | PR-1 |
| `app/(app)/_components/coming-soon.tsx` | `<PageShell status="coming-soon">` | PR-1 |
| `app/(app)/_components/status-dot.tsx` | `<Pill tone dot>` | PR-2 |
| `app/(app)/_components/tenant-pill.tsx` | `<Pill tone="success" mono dot>` | PR-2 |
| `app/(app)/_components/type-pill.tsx` (body) | `<Pill tone="accent" mono shape="square">` | PR-2 |
| `app/(app)/_components/view-tabs.tsx` | `<Tabs size="md">` | PR-3 |
| `app/(app)/_components/sailpoint-empty-state.tsx` | `<StateView size="md">` | PR-4 |
| `accounts-tab.tsx` inline `StatusPill` | `<AccountStatusPill>` (wrapper on `<Pill>`) | PR-2 |
| `identities/[id]/page.tsx` inline `TabLink`, `PermissionDenied`, `TabFailure`, `CountBadge` | `<Tabs>`, `<StateView>` | PR-3, PR-4 |
| `transforms/_components/row-actions.tsx` (current) | `<RowActions>` | PR-5 |
| `identities/_components/identities-table.tsx` `RowMenu` inline | `<RowActions>` | PR-5 |
| `identities/_components/account-row-actions.tsx` | `<RowActions>` (delete attributes-dialog kept) | PR-5 |
| `identities/_components/identity-kpi-strip.tsx` | `<StatGroup layout="grid">` | PR-8 |
| `identities/_components/identity-stats-strip.tsx` | `<StatGroup layout="inline">` | PR-8 |
| `identities/_components/identity-header.tsx` | `<DetailHeader>` | PR-8 |
| `transforms/_components/transform-drawer.tsx` header/tabs chrome | `<Drawer>` + `<DrawerHeader>` + `<Tabs size="sm">` | PR-3, PR-8 |

---

## 5. References

ADRs and design notes live in Anas's private Obsidian vault, not in this repo. Paths below are relative to the vault root.

- **Authoritative ADR (decisions & rationale):** `Projects/Simplified Identity/2026-05-12-visual-identity-v1.md`
- **Predecessor ADRs (abandoned Apple-DS):**
  - `Projects/Simplified Identity/2026-05-11-design-system-phase-1-tokens.md`
  - `Projects/Simplified Identity/2026-05-11-design-system-phase-2-primitives.md`
- **Related design notes:**
  - `Projects/Simplified Identity/2026-05-12-identities-list-redesign.md` — first surface to bake on the new primitives
  - `Projects/Simplified Identity/2026-05-12-identity-detail-redesign.md` — first detail page to use `<DetailShell>`
- **Visual references:** Linear, Vercel Dashboard, Stripe Dashboard, Plaid Dashboard.
