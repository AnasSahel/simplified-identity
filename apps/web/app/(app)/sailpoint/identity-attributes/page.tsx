import { headers } from "next/headers";
import { Search } from "lucide-react";

import { FilterBar } from "@/components/ui/filter-bar";
import { StateView } from "@/components/ui/state-view";
import { auth } from "@/lib/auth";
import {
  listIdentityAttributes,
  type IdentityAttributeSummary,
} from "@/lib/sailpoint/identity-attributes-api";

import { PageShell } from "../../_components/page-shell";
import {
  BooleanFilter,
  type BooleanFilterValue,
} from "./_components/boolean-filter";
import { DisabledFilter } from "./_components/disabled-filter";
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

function booleanFromParam(value: string | undefined): BooleanFilterValue {
  if (value === "yes" || value === "no") return value;
  return "all";
}

function toRow(attr: IdentityAttributeSummary): IdentityAttributeRow {
  return {
    // Tenant payloads usually omit a discrete `id` from the list endpoint —
    // fall back to `name` (which is also the URL key on the detail page).
    id: attr.name,
    name: attr.name,
    displayName: attr.displayName?.trim() || attr.name,
    type: attr.type ?? null,
    searchable: attr.searchable === true,
    standard: attr.standard === true,
    // `identityProfilesCount` and `transformsCount` are wired in #206 (the
    // unused-detection PR ships the per-row data fields alongside the
    // backend filter). Until that lands, we render 0 — a deliberate
    // "no data yet" rather than a fake value.
    identityProfilesCount: 0,
    transformsCount: 0,
    // `unused` / `drift` / `driftPercent` are surfaced by the row component
    // when provided. No row triggers them in this PR — the scaffolding
    // exists so #206 / #207 wiring is a data-only change.
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
  const searchableFilter = booleanFromParam(params.searchable);

  const userId = session.user.id;

  const result = await listIdentityAttributes(userId, {
    filters: q || undefined,
    scope,
  });

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

  const filtered = result.data.filter((a) => {
    if (typeFilter && (a.type ?? null) !== typeFilter) return false;
    if (
      searchableFilter !== "all" &&
      (a.searchable === true) !== (searchableFilter === "yes")
    )
      return false;
    return true;
  });

  const rows = filtered.map(toRow);

  const hasAnyFilter = Boolean(
    q ||
      typeFilter ||
      scope !== "all" ||
      searchableFilter !== "all",
  );

  return (
    <PageShell
      title="Identity attributes"
      description="Custom and standard identity attributes defined on the connected SailPoint tenant."
    >
      <div className="space-y-4">
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
              <DisabledFilter
                label="Drift"
                tooltip="Coming soon — null-population drift detection lands with #207."
              />
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
