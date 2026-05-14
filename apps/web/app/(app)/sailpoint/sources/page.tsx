import { headers } from "next/headers";

import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { StateView } from "@/components/ui/state-view";
import { auth } from "@/lib/auth";
import { getTenantSettings } from "@/lib/db/tenant-settings";
import { computeAggregationHealth } from "@/lib/sailpoint/source-health";
import {
  countAccounts,
  getSourceAccounts,
  listSources,
  type SourceSummary,
} from "@/lib/sailpoint/sources-api";

import { PageShell } from "../../_components/page-shell";
import { AuthoritativeFilter } from "./_components/authoritative-filter";
import { ClusterFilter } from "./_components/cluster-filter";
import { ConnectorFilter } from "./_components/connector-filter";
import { SourceSearchBox } from "./_components/source-search-box";
import {
  SourcesKpiStrip,
  type SourcesKpis,
} from "./_components/sources-kpi-strip";
import { SourcesTable, type SourceRow } from "./_components/sources-table";
import { StatusFilter } from "./_components/status-filter";
import {
  STATUS_OPTIONS,
  type StatusFilterValue,
} from "./_components/status-filter-shared";

const PAGE_SIZES = [25, 50, 100, 250] as const;
type PerPage = (typeof PAGE_SIZES)[number];
const DEFAULT_PER: PerPage = 25;

const VALID_STATUS_VALUES = new Set<StatusFilterValue>(
  STATUS_OPTIONS.map((o) => o.value),
);

const VALID_AUTH_VALUES = new Set(["yes", "no"]);

const VALID_SORTS = new Set(["name", "-name", "modified", "-modified"]);
const DEFAULT_SORT = "name";

function perFromParam(value: string | undefined): PerPage {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n)
    ? (n as PerPage)
    : DEFAULT_PER;
}

function pageFromParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function statusFromParam(value: string | undefined): StatusFilterValue | null {
  if (!value) return null;
  const v = value.toLowerCase() as StatusFilterValue;
  return VALID_STATUS_VALUES.has(v) ? v : null;
}

function authFromParam(value: string | undefined): "yes" | "no" | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return VALID_AUTH_VALUES.has(v) ? (v as "yes" | "no") : null;
}

function sortFromParam(value: string | undefined): string {
  if (!value) return DEFAULT_SORT;
  return VALID_SORTS.has(value) ? value : DEFAULT_SORT;
}

/**
 * Builds the SailPoint `filters` expression from URL state.
 *
 * Notes:
 *  - Search uses `name co "..."` (substring, case-insensitive on ISC).
 *  - `status=error` and `status=disconnected` both narrow to
 *    `healthy eq false` — the row pill distinguishes them via `status`
 *    string. See feedback in the v0 PR for the rationale.
 *  - `cluster.id eq "..."` is the natural ISC filter for cluster. If a
 *    tenant rejects this nested-field grammar with 400, the page
 *    error-handles via StateView.
 */
function buildSourcesFilter({
  q,
  type,
  status,
  auth,
  cluster,
}: {
  q: string;
  type: string | null;
  status: StatusFilterValue | null;
  auth: "yes" | "no" | null;
  cluster: string | null;
}): string | undefined {
  const clauses: string[] = [];
  if (q) {
    clauses.push(`name co "${q.replace(/"/g, '\\"')}"`);
  }
  if (type) {
    clauses.push(`connector eq "${type.replace(/"/g, '\\"')}"`);
  }
  if (status === "connected") {
    clauses.push("healthy eq true");
  } else if (status === "disconnected" || status === "error") {
    clauses.push("healthy eq false");
  }
  if (auth) {
    clauses.push(`authoritative eq ${auth === "yes" ? "true" : "false"}`);
  }
  if (cluster) {
    clauses.push(`cluster.id eq "${cluster.replace(/"/g, '\\"')}"`);
  }
  return clauses.length > 0 ? clauses.join(" and ") : undefined;
}

function toRow(
  source: SourceSummary,
  accountCount: number | null,
  thresholdHours: number,
): SourceRow {
  return {
    id: source.id,
    name: source.name,
    description: source.description ?? null,
    connector: source.connector ?? null,
    connectorName: source.connectorName ?? null,
    connectorClass: source.connectorClass ?? null,
    type: source.type ?? null,
    authoritative: Boolean(source.authoritative),
    healthy: source.healthy,
    status: source.status ?? null,
    since: source.since ?? null,
    owner: source.owner
      ? { id: source.owner.id, name: source.owner.name }
      : null,
    cluster: source.cluster
      ? { id: source.cluster.id, name: source.cluster.name }
      : null,
    accountCount,
    aggregationHealth: computeAggregationHealth(
      {
        since: source.since ?? null,
        healthy: source.healthy,
        status: source.status ?? null,
      },
      thresholdHours,
    ),
  };
}

function buildHref(
  base: string,
  searchParams: URLSearchParams,
  overrides: Record<string, string | null>,
): string {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Connector dropdown options derived from a tenant-wide source dump
 * (capped at 250). On larger tenants the dropdown is incomplete but the
 * URL-typed filter still routes correctly through the SailPoint API.
 */
function buildConnectorOptions(
  sources: SourceSummary[],
  selected: string | null,
): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const s of sources) {
    if (!s.connector) continue;
    if (!seen.has(s.connector)) {
      seen.set(s.connector, s.connectorName ?? s.connector);
    }
  }
  if (selected && !seen.has(selected)) {
    seen.set(selected, selected);
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

/**
 * Cluster dropdown options — same tenant-wide source dump as above,
 * keyed by cluster id with the cluster name as label.
 */
function buildClusterOptions(
  sources: SourceSummary[],
  selected: string | null,
): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const s of sources) {
    if (!s.cluster?.id) continue;
    if (!seen.has(s.cluster.id)) {
      seen.set(s.cluster.id, s.cluster.name);
    }
  }
  if (selected && !seen.has(selected)) {
    seen.set(selected, selected);
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

/**
 * Derive header KPI counts from the tenant-wide dump (the lookup query
 * we're already running for the Connector / Cluster dropdowns). Counts
 * scoped to the first 250 sources; on larger tenants this becomes a
 * floor estimate. Acceptable for KPI display — the headline number on
 * Total matches a separate `count=true&limit=1` server count.
 */
function deriveKpisFromDump(
  sources: SourceSummary[],
): {
  authoritative: number;
  accountSources: number;
  healthy: number;
  inError: number;
} {
  let authoritative = 0;
  let accountSources = 0;
  let healthy = 0;
  let inError = 0;
  for (const s of sources) {
    if (s.authoritative) authoritative += 1;
    else accountSources += 1;
    if (s.healthy === true) healthy += 1;
    else if (s.healthy === false) inError += 1;
  }
  return { authoritative, accountSources, healthy, inError };
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    per?: string;
    q?: string;
    type?: string;
    status?: string;
    auth?: string;
    cluster?: string;
    sort?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const per = perFromParam(params.per);
  const q = (params.q ?? "").trim();
  const type = (params.type ?? "").trim() || null;
  const status = statusFromParam(params.status);
  const authFilter = authFromParam(params.auth);
  const cluster = (params.cluster ?? "").trim() || null;
  const sort = sortFromParam(params.sort);
  const requestedPage = pageFromParam(params.page);

  const userId = session.user.id;
  const offset = (requestedPage - 1) * per;

  const filters = buildSourcesFilter({
    q,
    type,
    status,
    auth: authFilter,
    cluster,
  });

  // Main list + tenant-wide lookup (for KPIs + filter options) +
  // global orphan count + tenant settings fire in parallel. The orphan
  // count is best-effort; failure → null KPI cell, not an error state.
  // Tenant settings hit the local DB so they're cheap — bundled in the
  // same Promise.all to keep the request waterfall flat.
  const [listResult, dumpResult, orphanAccounts, tenantSettings] =
    await Promise.all([
      listSources(userId, {
        limit: per,
        offset,
        filters,
        sorters: sort,
        count: true,
      }),
      listSources(userId, { limit: 250, sorters: "name" }),
      countAccounts(userId, { filters: "uncorrelated eq true" }),
      getTenantSettings(userId),
    ]);

  if (!listResult.ok) {
    return (
      <PageShell
        title="Sources"
        description="Aggregations, errors, and orphan accounts at a glance."
      >
        {listResult.status === 403 ? (
          <NoPermissionState />
        ) : (
          <StateView
            intent={
              listResult.status === 0
                ? "not_connected"
                : listResult.status === 401
                  ? "auth_failed"
                  : "api_error"
            }
            title={
              listResult.status === 0
                ? "Connect your SailPoint tenant"
                : listResult.status === 401
                  ? "SailPoint session expired"
                  : "SailPoint API error"
            }
            description={
              listResult.status === 0
                ? "Sign in with SailPoint to load this view from your tenant."
                : listResult.status === 401
                  ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                  : "The request failed. Try again, or contact your administrator if it persists."
            }
            detail={
              listResult.status >= 400
                ? `${listResult.status} ${listResult.message}`
                : undefined
            }
          />
        )}
      </PageShell>
    );
  }

  // Per-row account counts via `count=true&limit=1` on /v2025/accounts.
  // Promise.allSettled keeps the page robust if any single count fails.
  const accountCountSettled = await Promise.allSettled(
    listResult.data.map((s) =>
      getSourceAccounts(userId, s.id, { count: true, limit: 1 }),
    ),
  );
  const thresholdHours = tenantSettings.aggregationFreshnessThresholdHours;
  const rows = listResult.data.map((source, i) => {
    const settled = accountCountSettled[i];
    let count: number | null = null;
    if (settled.status === "fulfilled" && settled.value.ok) {
      count = settled.value.total ?? settled.value.data.length;
    }
    return toRow(source, count, thresholdHours);
  });

  const total = listResult.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(requestedPage, totalPages);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + rows.length, total);

  const dumpSources = dumpResult.ok ? dumpResult.data : [];
  const connectorOptions = buildConnectorOptions(dumpSources, type);
  const clusterOptions = buildClusterOptions(dumpSources, cluster);
  const dumpKpis = deriveKpisFromDump(dumpSources);

  // KPI headline numbers: prefer the full tenant Total from the main
  // count, fall back to dump size when only the dump is available.
  const kpis: SourcesKpis = {
    total: listResult.total ?? dumpSources.length,
    healthy: dumpResult.ok ? dumpKpis.healthy : null,
    inError: dumpResult.ok ? dumpKpis.inError : null,
    authoritative: dumpResult.ok ? dumpKpis.authoritative : null,
    accountSources: dumpResult.ok ? dumpKpis.accountSources : null,
    orphanAccounts: orphanAccounts ?? null,
  };

  const currentSearchParams = new URLSearchParams();
  if (q) currentSearchParams.set("q", q);
  if (type) currentSearchParams.set("type", type);
  if (status) currentSearchParams.set("status", status);
  if (authFilter) currentSearchParams.set("auth", authFilter);
  if (cluster) currentSearchParams.set("cluster", cluster);
  if (sort !== DEFAULT_SORT) currentSearchParams.set("sort", sort);
  if (per !== DEFAULT_PER) currentSearchParams.set("per", String(per));
  if (page > 1) currentSearchParams.set("page", String(page));

  const hasAnyFilter = Boolean(q || type || status || authFilter || cluster);

  return (
    <PageShell
      title="Sources"
      description="Aggregations, errors, and orphan accounts at a glance."
    >
      <div className="space-y-4">
        <SourcesKpiStrip kpis={kpis} />

        <FilterBar
          search={<SourceSearchBox initial={q} />}
          clearHref={hasAnyFilter ? "/sailpoint/sources" : undefined}
          filters={
            <>
              <ConnectorFilter options={connectorOptions} selected={type} />
              <AuthoritativeFilter selected={authFilter} />
              <StatusFilter selected={status} />
              <ClusterFilter options={clusterOptions} selected={cluster} />
            </>
          }
        />

        <SourcesTable data={rows} />

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          perPage={per}
          perPageOptions={PAGE_SIZES}
          hrefForPage={(p) =>
            buildHref("/sailpoint/sources", currentSearchParams, {
              page: p === 1 ? null : String(p),
            })
          }
          hrefForPerPage={(n) =>
            buildHref("/sailpoint/sources", currentSearchParams, {
              page: null,
              per: n === DEFAULT_PER ? null : String(n),
            })
          }
        />
      </div>
    </PageShell>
  );
}

function NoPermissionState() {
  return (
    <StateView
      intent="forbidden"
      title="No permission to view sources"
      description={
        <>
          Your SailPoint session is connected, but the API rejected the
          request with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            403 Forbidden
          </code>
          . Ask your tenant administrator to grant the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            idn:source:read
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            sp:scopes:all
          </code>{" "}
          scopes on your OAuth client, then sign in again.
        </>
      }
    />
  );
}
