import { headers } from "next/headers";

import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { StateView } from "@/components/ui/state-view";
import { auth } from "@/lib/auth";
import {
  getSourceAccounts,
  listSources,
  type SourceSummary,
} from "@/lib/sailpoint/sources-api";

import { PageShell } from "../../_components/page-shell";
import { ConnectorFilter } from "./_components/connector-filter";
import { SourceSearchBox } from "./_components/source-search-box";
import { StatusFilter } from "./_components/status-filter";
import {
  STATUS_OPTIONS,
  type StatusFilterValue,
} from "./_components/status-filter-shared";
import { SourcesTable, type SourceRow } from "./_components/sources-table";

const PAGE_SIZES = [25, 50, 100, 250] as const;
type PerPage = (typeof PAGE_SIZES)[number];
const DEFAULT_PER: PerPage = 25;

const VALID_STATUS_VALUES = new Set<StatusFilterValue>(
  STATUS_OPTIONS.map((o) => o.value),
);

/**
 * URL sort param accepts a closed list of sorters SailPoint actually
 * indexes on `/v2025/sources`. Anything else collapses to the default
 * so we don't relay malformed grammar into the API.
 */
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
 *    `healthy eq false` because ISC has no single-field grammar that
 *    cleanly distinguishes error from idle-disconnected. The row-level
 *    pill still tells them apart via the `status` string. Multi-select
 *    + a richer expression are tracked as follow-ups.
 */
function buildSourcesFilter({
  q,
  type,
  status,
}: {
  q: string;
  type: string | null;
  status: StatusFilterValue | null;
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
  return clauses.length > 0 ? clauses.join(" and ") : undefined;
}

function toRow(source: SourceSummary, accountCount: number | null): SourceRow {
  return {
    id: source.id,
    name: source.name,
    description: source.description ?? null,
    connector: source.connector ?? null,
    connectorName: source.connectorName ?? null,
    authoritative: Boolean(source.authoritative),
    healthy: source.healthy,
    status: source.status ?? null,
    since: source.since ?? null,
    owner: source.owner
      ? { id: source.owner.id, name: source.owner.name }
      : null,
    accountCount,
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
 * Derives unique connector options from a tenant-wide source dump.
 *
 * Capped at 250 sources — covers virtually every real tenant. On larger
 * tenants the dropdown is incomplete but the URL-typed filter still
 * routes correctly through the SailPoint API.
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

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    per?: string;
    q?: string;
    type?: string;
    status?: string;
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
  const sort = sortFromParam(params.sort);
  const requestedPage = pageFromParam(params.page);

  const userId = session.user.id;
  const offset = (requestedPage - 1) * per;

  const filters = buildSourcesFilter({ q, type, status });

  // Main list + connector-options lookup fire in parallel. The lookup
  // is unfiltered so the dropdown stays stable across navigations; cost
  // is one extra `/v2025/sources?limit=250` per page render.
  const [listResult, connectorListResult] = await Promise.all([
    listSources(userId, {
      limit: per,
      offset,
      filters,
      sorters: sort,
      count: true,
    }),
    listSources(userId, { limit: 250, sorters: "name" }),
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
  // Promise.allSettled keeps the page robust if any single count fails —
  // the row falls back to "—" rather than poisoning the whole table.
  const accountCountSettled = await Promise.allSettled(
    listResult.data.map((s) =>
      getSourceAccounts(userId, s.id, { count: true, limit: 1 }),
    ),
  );
  const rows = listResult.data.map((source, i) => {
    const settled = accountCountSettled[i];
    let count: number | null = null;
    if (settled.status === "fulfilled" && settled.value.ok) {
      count = settled.value.total ?? settled.value.data.length;
    }
    return toRow(source, count);
  });

  const total = listResult.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(requestedPage, totalPages);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + rows.length, total);

  const connectorOptions = connectorListResult.ok
    ? buildConnectorOptions(connectorListResult.data, type)
    : type
      ? [{ value: type, label: type }]
      : [];

  const currentSearchParams = new URLSearchParams();
  if (q) currentSearchParams.set("q", q);
  if (type) currentSearchParams.set("type", type);
  if (status) currentSearchParams.set("status", status);
  if (sort !== DEFAULT_SORT) currentSearchParams.set("sort", sort);
  if (per !== DEFAULT_PER) currentSearchParams.set("per", String(per));
  if (page > 1) currentSearchParams.set("page", String(page));

  const hasAnyFilter = Boolean(q || type || status);

  return (
    <PageShell
      title="Sources"
      description="Aggregations, errors, and orphan accounts at a glance."
    >
      <div className="space-y-4">
        <FilterBar
          search={<SourceSearchBox initial={q} />}
          clearHref={hasAnyFilter ? "/sailpoint/sources" : undefined}
          filters={
            <>
              <ConnectorFilter options={connectorOptions} selected={type} />
              <StatusFilter selected={status} />
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
