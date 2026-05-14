import { headers } from "next/headers";
import { Search } from "lucide-react";

import { FilterBar } from "@/components/ui/filter-bar";
import { StateView } from "@/components/ui/state-view";
import { auth } from "@/lib/auth";
import {
  getDriftSnapshot,
  type DriftSnapshotRow,
} from "@/lib/identity-attributes/drift-snapshot";
import {
  getIdentityAttributesUsageSnapshot,
  listIdentityAttributes,
  type IdentityAttributeSummary,
  type IdentityAttributeUsageSnapshot,
} from "@/lib/sailpoint/identity-attributes-api";

import { PageShell } from "../../_components/page-shell";
import {
  BooleanFilter,
  type BooleanFilterValue,
} from "./_components/boolean-filter";
import { DisabledFilter } from "./_components/disabled-filter";
import { DriftFilter } from "./_components/drift-filter";
import { IdentityAttributesKpiStrip } from "./_components/identity-attributes-kpi-strip";
import {
  IdentityAttributesTable,
  type IdentityAttributeRow,
} from "./_components/identity-attributes-table";
import {
  ScopeFilter,
  type ScopeFilterValue,
} from "./_components/scope-filter";
import { TypeFilter } from "./_components/type-filter";

/**
 * Identity Attributes list page.
 *
 * Read-only browser over `GET /v2025/identity-attributes`. The factory
 * (`listIdentityAttributes`) already handles auth + `scope` + free-text
 * filtering — this page layers on `type` / `searchable` client-side because
 * the endpoint doesn't accept SCIM filters.
 *
 * v1 (#205) reshapes the table: avatar + displayName + technicalName + id
 * in column 1, Origin pill (tinted), Identity profiles + Transforms counts.
 * Multi-valued + Sources columns dropped. "Computed by" intentionally NOT
 * added — see issue #205 for the rationale (a single column can't express
 * per-profile producer transforms without lying).
 *
 * Pagination is intentionally omitted: a tenant typically carries 20–60
 * rows here, well below the threshold where paging adds value.
 */

function scopeFromParam(value: string | undefined): ScopeFilterValue {
  if (value === "standard" || value === "custom") return value;
  return "all";
}

/**
 * `?scope=unused` is handled separately from the standard/custom toggle
 * (which `scopeFromParam` covers). It doesn't change the factory call —
 * the factory still lists all attributes — it only narrows the rendered
 * rows to those flagged unused by the snapshot. Kept as its own derived
 * boolean so a future "unused + custom" combination stays expressible
 * without overloading the existing `scope` enum.
 */
function isUnusedScope(value: string | undefined): boolean {
  return value === "unused";
}

/**
 * `?scope=drift` — sibling of `?scope=unused`. Narrows the rendered
 * rows to those flagged drifting (tier IN warning|danger) by the drift
 * snapshot. Same shape as `isUnusedScope` to keep the page's URL
 * contract uniform; rides the same `scope` URL param so the two
 * filters are mutually exclusive.
 */
function isDriftScope(value: string | undefined): boolean {
  return value === "drift";
}

function booleanFromParam(value: string | undefined): BooleanFilterValue {
  if (value === "yes" || value === "no") return value;
  return "all";
}

function toRow(
  attr: IdentityAttributeSummary,
  usage: IdentityAttributeUsageSnapshot | undefined,
  drift: DriftSnapshotRow | undefined,
): IdentityAttributeRow {
  const driftActive = drift?.tier === "warning" || drift?.tier === "danger";
  return {
    // Tenant payloads usually omit a discrete `id` from the list endpoint —
    // fall back to `name` (which is also the URL key on the detail page).
    id: attr.name,
    name: attr.name,
    displayName: attr.displayName?.trim() || attr.name,
    type: attr.type ?? null,
    searchable: attr.searchable === true,
    standard: attr.standard === true,
    unused: usage?.unused === true,
    identityProfilesCount: usage?.identityProfilesCount ?? 0,
    transformsCount: usage?.transformsCount ?? 0,
    drift: driftActive,
    driftTier: drift?.tier ?? null,
    driftPercent: drift ? Math.round(drift.nullRatio * 100) : undefined,
  };
}

export default async function IdentityAttributesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    scope?: string;
    searchable?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const typeFilter = (params.type ?? "").trim() || null;
  const scope = scopeFromParam(params.scope);
  const unusedScope = isUnusedScope(params.scope);
  const driftScope = isDriftScope(params.scope);
  const searchableFilter = booleanFromParam(params.searchable);

  const userId = session.user.id;

  // Run the listing call, the usage snapshot, and the drift snapshot in
  // parallel. Usage snapshot is best-effort: if it fails we still render
  // the list. Drift snapshot is a local DB read so it doesn't fail at
  // run-time (an empty table just renders as "No drift snapshot yet").
  const [result, snapshotResult, driftRead] = await Promise.all([
    listIdentityAttributes(userId, {
      filters: q || undefined,
      scope,
    }),
    getIdentityAttributesUsageSnapshot(userId),
    getDriftSnapshot(),
  ]);

  if (!result.ok) {
    return (
      <PageShell
        title="Identity attributes"
        description="Custom and standard identity attributes defined on the connected SailPoint tenant."
      >
        {result.status === 403 ? (
          <NoPermissionState />
        ) : (
          <StateView
            intent={
              result.status === 0
                ? "not_connected"
                : result.status === 401
                  ? "auth_failed"
                  : "api_error"
            }
            title={
              result.status === 0
                ? "Connect your SailPoint tenant"
                : result.status === 401
                  ? "SailPoint session expired"
                  : "SailPoint API error"
            }
            description={
              result.status === 0
                ? "Sign in with SailPoint to load this view from your tenant."
                : result.status === 401
                  ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                  : "The request failed. Try again, or contact your administrator if it persists."
            }
            detail={
              result.status >= 400
                ? `${result.status} ${result.message}`
                : undefined
            }
          />
        )}
      </PageShell>
    );
  }

  // Derive the type-filter options BEFORE applying the type filter so the
  // dropdown doesn't shrink to one option after a selection.
  const availableTypes = Array.from(
    new Set(
      result.data
        .map((a) => a.type)
        .filter((t): t is string => typeof t === "string" && t.length > 0),
    ),
  ).sort();

  // Index the snapshot by attribute name for O(1) merge into the rows.
  // When the snapshot call failed we treat every row as `unused: false`
  // (the toRow default when `snapshot` is undefined) and we suppress the
  // `?scope=unused` filter so a misconfigured tenant doesn't render an
  // empty page for the wrong reason.
  const snapshotByName = new Map<string, IdentityAttributeUsageSnapshot>();
  if (snapshotResult.ok) {
    for (const s of snapshotResult.data) {
      snapshotByName.set(s.attributeName, s);
    }
  }
  const unusedFilterActive = unusedScope && snapshotResult.ok;

  // Drift snapshot is a DB read — index it for the merge + filter.
  // Empty when the admin hasn't refreshed yet; `?scope=drift` is
  // suppressed in that case so the table doesn't show "no rows" for
  // the wrong reason.
  const driftByName = new Map<string, DriftSnapshotRow>();
  for (const r of driftRead.rows) {
    driftByName.set(r.attributeName, r);
  }
  const driftFilterActive = driftScope && driftRead.capturedAt !== null;

  const filtered = result.data.filter((a) => {
    if (typeFilter && (a.type ?? null) !== typeFilter) return false;
    if (
      searchableFilter !== "all" &&
      (a.searchable === true) !== (searchableFilter === "yes")
    )
      return false;
    if (unusedFilterActive && snapshotByName.get(a.name)?.unused !== true)
      return false;
    if (driftFilterActive) {
      const tier = driftByName.get(a.name)?.tier;
      if (tier !== "warning" && tier !== "danger") return false;
    }
    return true;
  });

  const rows = filtered.map((a) =>
    toRow(a, snapshotByName.get(a.name), driftByName.get(a.name)),
  );

  // KPI cards reflect the full tenant population (pre-filter), so the
  // numbers stay stable when the user narrows the table below. Card 3
  // (Unused) reads from the usage snapshot; card 4 (Drift) reads from
  // the drift snapshot table. Either degrades to `null` (rendered "—")
  // when no data is available yet.
  const total = result.data.length;
  const standardCount = result.data.filter((a) => a.standard === true).length;
  const customCount = total - standardCount;
  const searchableCount = result.data.filter(
    (a) => a.searchable === true,
  ).length;
  const driftCount =
    driftRead.capturedAt === null
      ? null
      : driftRead.rows.filter(
          (r) => r.tier === "warning" || r.tier === "danger",
        ).length;
  const driftWarningCount = driftRead.rows.filter(
    (r) => r.tier === "warning",
  ).length;
  const driftDangerCount = driftRead.rows.filter(
    (r) => r.tier === "danger",
  ).length;
  const kpis = {
    total,
    standardCount,
    customCount,
    searchableCount,
    unusedCount: snapshotResult.ok
      ? snapshotResult.data.filter((s) => s.unused).length
      : null,
    driftCount,
    driftWarningCount,
    driftDangerCount,
    // Pass the snapshot timestamp through to the strip — card 4 owns
    // both the value and the refresh affordance now (#240). The
    // standalone `<DriftSnapshotHeader>` row that used to sit between
    // the strip and the FilterBar is gone.
    driftCapturedAt: driftRead.capturedAt,
  };

  const hasAnyFilter = Boolean(
    q ||
      typeFilter ||
      scope !== "all" ||
      unusedScope ||
      driftScope ||
      searchableFilter !== "all",
  );

  return (
    <PageShell
      title="Identity attributes"
      description="Custom and standard identity attributes defined on the connected SailPoint tenant."
    >
      <div className="space-y-4">
        <IdentityAttributesKpiStrip kpis={kpis} />
        <FilterBar
          search={
            <form
              action="/sailpoint/identity-attributes"
              method="get"
              className="relative min-w-[16rem] flex-1"
              role="search"
            >
              {typeFilter && (
                <input type="hidden" name="type" value={typeFilter} />
              )}
              {scope !== "all" && (
                <input type="hidden" name="scope" value={scope} />
              )}
              {unusedScope && (
                <input type="hidden" name="scope" value="unused" />
              )}
              {driftScope && (
                <input type="hidden" name="scope" value="drift" />
              )}
              {searchableFilter !== "all" && (
                <input
                  type="hidden"
                  name="searchable"
                  value={searchableFilter}
                />
              )}
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search by name or display name…"
                className="si-body h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Search identity attributes"
              />
            </form>
          }
          clearHref={hasAnyFilter ? "/sailpoint/identity-attributes" : undefined}
          filters={
            <>
              <TypeFilter
                availableTypes={availableTypes}
                selected={typeFilter}
              />
              <ScopeFilter selected={scope} />
              <BooleanFilter
                label="Searchable"
                paramKey="searchable"
                selected={searchableFilter}
              />
              <DisabledFilter
                label="Unused"
                tooltip="Coming soon — unused-attribute detection lands with #206."
              />
              <DriftFilter selected={driftScope} />
            </>
          }
        />

        {rows.length === 0 ? (
          <StateView
            intent="empty"
            title="No identity attributes match"
            description={
              hasAnyFilter
                ? "Try widening your filters or clearing them."
                : "This tenant doesn't expose any identity attributes."
            }
          />
        ) : (
          <IdentityAttributesTable data={rows} />
        )}
      </div>
    </PageShell>
  );
}

function NoPermissionState() {
  return (
    <StateView
      intent="forbidden"
      title="No permission to view identity attributes"
      description={
        <>
          Your SailPoint session is connected, but the API rejected the
          request with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            403 Forbidden
          </code>
          . Ask your tenant administrator to grant the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            sp:scopes:all
          </code>{" "}
          scope on your OAuth client, then sign in again.
        </>
      }
    />
  );
}
