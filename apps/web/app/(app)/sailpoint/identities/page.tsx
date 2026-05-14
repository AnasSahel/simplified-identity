import { headers } from "next/headers";

import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { StateView } from "@/components/ui/state-view";
import { auth } from "@/lib/auth";
import {
  countIdentities,
  listIdentityProfiles,
  searchIdentities,
} from "@/lib/sailpoint/identities-api";

import { PageShell } from "../../_components/page-shell";
import { DepartmentFilter } from "./_components/department-filter";
import { IdentitiesTable } from "./_components/identities-table";
import {
  IdentityKpiStrip,
  type IdentityKpis,
} from "./_components/identity-kpi-strip";
import { LcsFilter } from "./_components/lcs-filter";
import { ProfileFilter } from "./_components/profile-filter";
import { RiskFilter } from "./_components/risk-filter";
import { SearchBox } from "./_components/search-box";
import { toRow } from "./_lib/csv";

const PAGE_SIZES = [25, 50, 100, 250] as const;
type PerPage = (typeof PAGE_SIZES)[number];
const DEFAULT_PER: PerPage = 25;

/**
 * Elastic query fragment for the "External / contractors" KPI. Used when
 * the tenant doesn't expose a stable `attributes.type` field.
 */
const CONTRACTOR_QUERY =
  '(identityProfile.name:*contractor* OR identityProfile.name:*external* OR identityProfile.name:*prestataire* OR identityProfile.name:*ext*)';

const HIGH_RISK_QUERY =
  '(attributes.identityRiskScore:"high" OR attributes.identityRiskScore:"critical")';

const RISK_PRESENT_QUERY = "attributes.identityRiskScore:*";

const VALID_RISK_VALUES = new Set(["low", "medium", "high", "critical"]);

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

function lcsFromParam(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return v || null;
}

function riskFromParam(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return VALID_RISK_VALUES.has(v) ? v : null;
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

export default async function IdentitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    per?: string;
    q?: string;
    profile?: string;
    lcs?: string;
    department?: string;
    risk?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const per = perFromParam(params.per);
  const q = (params.q ?? "").trim();
  const profile = (params.profile ?? "").trim() || null;
  const lcs = lcsFromParam(params.lcs);
  const department = (params.department ?? "").trim() || null;
  const risk = riskFromParam(params.risk);
  const requestedPage = pageFromParam(params.page);

  const userId = session.user.id;
  const offset = (requestedPage - 1) * per;

  const searchParamsBase = {
    q,
    profileId: profile,
    lcs,
    department,
    risk,
  };

  // Main search + profile dropdown + KPI counts all fire in parallel.
  // Counts fail soft (undefined → 0) so a transient count failure can't
  // take the whole page down.
  //
  // The "pending" sub-line on the Total card and the Awaiting Onboarding
  // card both count LCS `prehire` — one fetch, used twice.
  const [
    searchResult,
    profilesResult,
    totalCount,
    activeCount,
    prehireCount,
    externalCount,
    highRiskCount,
    riskPresenceCount,
  ] = await Promise.all([
    searchIdentities(userId, { ...searchParamsBase, limit: per, offset }),
    listIdentityProfiles(userId).catch(() => ({
      ok: false as const,
      status: 0,
      message: "fetch failed",
    })),
    countIdentities(userId, {}),
    countIdentities(userId, { lcs: "active" }),
    countIdentities(userId, { lcs: "prehire" }),
    countIdentities(userId, { extra: CONTRACTOR_QUERY }),
    countIdentities(userId, { extra: HIGH_RISK_QUERY }),
    countIdentities(userId, { extra: RISK_PRESENT_QUERY }),
  ]);

  if (!searchResult.ok) {
    return (
      <PageShell
        title="Identities"
        description="Unified workforce identities across all connected sources."
      >
        {searchResult.status === 403 ? (
          <NoPermissionState />
        ) : (
          <StateView
            intent={
              searchResult.status === 0
                ? "not_connected"
                : searchResult.status === 401
                  ? "auth_failed"
                  : "api_error"
            }
            title={
              searchResult.status === 0
                ? "Connect your SailPoint tenant"
                : searchResult.status === 401
                  ? "SailPoint session expired"
                  : "SailPoint API error"
            }
            description={
              searchResult.status === 0
                ? "Sign in with SailPoint to load this view from your tenant."
                : searchResult.status === 401
                  ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                  : "The request failed. Try again, or contact your administrator if it persists."
            }
            detail={
              searchResult.status >= 400
                ? `${searchResult.status} ${searchResult.message}`
                : undefined
            }
          />
        )}
      </PageShell>
    );
  }

  const rows = searchResult.data.map(toRow);
  const total = searchResult.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(requestedPage, totalPages);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + rows.length, total);

  const profiles = profilesResult.ok ? profilesResult.data : [];

  // Risk feature is on if the tenant exposes `identityRiskScore` anywhere.
  // Probed via a count-only search for `*` on the field — cheap, and
  // independent of the current filters so the column doesn't disappear
  // mid-pagination.
  const riskAvailable =
    typeof riskPresenceCount === "number" && riskPresenceCount > 0;

  const kpis: IdentityKpis = {
    total: totalCount ?? 0,
    active: activeCount ?? 0,
    pending: prehireCount ?? 0,
    external: externalCount ?? 0,
    highRisk: riskAvailable ? (highRiskCount ?? 0) : null,
    awaitingOnboarding: prehireCount ?? 0,
  };

  const currentSearchParams = new URLSearchParams();
  if (q) currentSearchParams.set("q", q);
  if (profile) currentSearchParams.set("profile", profile);
  if (lcs) currentSearchParams.set("lcs", lcs);
  if (department) currentSearchParams.set("department", department);
  if (risk) currentSearchParams.set("risk", risk);
  if (per !== DEFAULT_PER) currentSearchParams.set("per", String(per));
  if (page > 1) currentSearchParams.set("page", String(page));

  const hasAnyFilter = Boolean(q || profile || lcs || department || risk);

  return (
    <PageShell
      title="Identities"
      description="Unified workforce identities across all connected sources."
    >
      <div className="space-y-4">
        <IdentityKpiStrip kpis={kpis} />

        <FilterBar
          search={<SearchBox initial={q} />}
          clearHref={hasAnyFilter ? "/sailpoint/identities" : undefined}
          filters={
            <>
              <ProfileFilter
                options={profiles.map((p) => ({ id: p.id, name: p.name }))}
                selected={profile}
              />
              <LcsFilter selected={lcs} />
              <DepartmentFilter initial={department} />
              {riskAvailable && <RiskFilter selected={risk} />}
            </>
          }
        />

        <IdentitiesTable
          data={rows}
          riskAvailable={riskAvailable}
          total={total}
          perPage={per}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          perPage={per}
          perPageOptions={PAGE_SIZES}
          hrefForPage={(p) =>
            buildHref("/sailpoint/identities", currentSearchParams, {
              page: p === 1 ? null : String(p),
            })
          }
          hrefForPerPage={(n) =>
            buildHref("/sailpoint/identities", currentSearchParams, {
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
      title="No permission to view identities"
      description={
        <>
          Your SailPoint session is connected, but the API rejected the
          request with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            403 Forbidden
          </code>
          . Ask your tenant administrator to grant the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            idn:identity:read
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
