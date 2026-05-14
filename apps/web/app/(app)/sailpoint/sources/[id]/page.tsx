import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";
import { StateView } from "@/components/ui/state-view";
import { Tabs } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { listIdentityProfiles } from "@/lib/sailpoint/identities-api";
import {
  countEntitlements,
  getSource,
  getSourceAccounts,
  getSourceSchemas,
  type SourceAccount,
} from "@/lib/sailpoint/sources-api";

import { DetailShell } from "../../../_components/detail-shell";
import { isAggregationRunning } from "../_components/aggregation-status-shared";
import { SourceAccountsTable } from "../_components/source-accounts-table";
import { SourceDetailHeader } from "../_components/source-detail-header";
import { SourceOverview } from "../_components/source-overview";
import { SourceSchemas } from "../_components/source-schemas";
import {
  parseScheduleFromConnectorAttributes,
  SourceStatStrip,
} from "../_components/source-stat-strip";

type TabId = "overview" | "accounts" | "schemas";
const TABS: TabId[] = ["overview", "accounts", "schemas"];

const ACCOUNTS_PAGE_SIZES = [25, 50, 100, 250] as const;
type AccountsPerPage = (typeof ACCOUNTS_PAGE_SIZES)[number];
const DEFAULT_ACCOUNTS_PER: AccountsPerPage = 25;

/**
 * How many accounts to sample for the Overview KPIs (correlation rate
 * and attribute coverage). Capped at 250 because ISC paginates and these
 * KPIs degrade gracefully on larger tenants — the sub-line flags the
 * sample when `total > sample`.
 */
const OVERVIEW_SAMPLE_SIZE = 250;

function tabFromParam(value: string | undefined): TabId {
  return (TABS as readonly string[]).includes(value ?? "")
    ? (value as TabId)
    : "overview";
}

function accountsPerFromParam(value: string | undefined): AccountsPerPage {
  const n = Number(value);
  return (ACCOUNTS_PAGE_SIZES as readonly number[]).includes(n)
    ? (n as AccountsPerPage)
    : DEFAULT_ACCOUNTS_PER;
}

function accountsPageFromParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function PermissionDenied({ resource }: { resource: string }) {
  return (
    <StateView
      intent="forbidden"
      size="sm"
      title={`No permission to read ${resource}`}
      description="Ask an administrator to grant the corresponding ISC scope on this tenant."
    />
  );
}

function TabFailure({
  status,
  resource,
  message,
}: {
  status: number;
  resource: string;
  message: string;
}) {
  if (status === 403) return <PermissionDenied resource={resource} />;
  return (
    <StateView
      intent="api_error"
      size="sm"
      title={`Couldn't load ${resource}`}
      description={message}
      detail={status > 0 ? String(status) : undefined}
      action={null}
    />
  );
}

function toAccountRow(account: SourceAccount) {
  return {
    id: account.id,
    name: account.name ?? null,
    nativeIdentity: account.nativeIdentity ?? null,
    identityId: account.identityId ?? null,
    authoritative: Boolean(account.authoritative),
    disabled: Boolean(account.disabled),
    locked: Boolean(account.locked),
    modified: account.modified ?? null,
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

export default async function SourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    accpage?: string;
    accper?: string;
    schema?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const tab = tabFromParam(sp.tab);
  const accountsPer = accountsPerFromParam(sp.accper);
  const accountsPage = accountsPageFromParam(sp.accpage);
  const schemaParam = (sp.schema ?? "").toLowerCase();
  const userId = session.user.id;

  // Accounts fetch shape depends on the active tab:
  //  - Overview needs a fixed sample (up to OVERVIEW_SAMPLE_SIZE) to
  //    compute KPI percentages.
  //  - Accounts needs the user-selected page slice + total count for
  //    pagination chrome.
  // On Schemas, we still fetch the small sample because the header pill
  // ("N accounts") on the Accounts tab needs the count regardless of
  // which tab is open, and a `count=true&limit=1` request gives us that
  // for free.
  const accountsFetchParams =
    tab === "accounts"
      ? {
          count: true,
          limit: accountsPer,
          offset: (accountsPage - 1) * accountsPer,
        }
      : tab === "overview"
        ? { count: true, limit: OVERVIEW_SAMPLE_SIZE }
        : { count: true, limit: 1 };

  // The 5-stat strip (issue #184) needs a small account sample to compute
  // `correlated · orphans`. The Overview tab already fetches one
  // (OVERVIEW_SAMPLE_SIZE); on other tabs we fetch a separate small sample
  // dedicated to the strip rather than inflate the accounts fetch above —
  // pagination on the Accounts tab and `count=1` on Schemas should stay
  // tight.
  const stripSampleNeeded = tab !== "overview";

  const [
    sourceResult,
    accountsResult,
    schemasResult,
    stripSampleResult,
    entitlementsTotal,
    profilesResult,
  ] = await Promise.all([
    getSource(userId, id),
    getSourceAccounts(userId, id, accountsFetchParams),
    getSourceSchemas(userId, id),
    stripSampleNeeded
      ? getSourceAccounts(userId, id, { count: false, limit: 250 })
      : Promise.resolve(null),
    countEntitlements(userId, { sourceId: id }),
    listIdentityProfiles(userId),
  ]);

  if (!sourceResult.ok) {
    if (sourceResult.status === 404) notFound();
    return (
      <DetailShell
        back={{ href: "/sailpoint/sources", label: "All sources" }}
        header={null}
      >
        {sourceResult.status === 403 ? (
          <PermissionDenied resource="this source" />
        ) : (
          <StateView
            intent={
              sourceResult.status === 0
                ? "not_connected"
                : sourceResult.status === 401
                  ? "auth_failed"
                  : "api_error"
            }
            title={
              sourceResult.status === 0
                ? "Connect your SailPoint tenant"
                : sourceResult.status === 401
                  ? "SailPoint session expired"
                  : "SailPoint API error"
            }
            description={
              sourceResult.status === 0
                ? "Sign in with SailPoint to load this source from your tenant."
                : sourceResult.status === 401
                  ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                  : "The request failed. Try again, or contact your administrator if it persists."
            }
            detail={
              sourceResult.status >= 400
                ? `${sourceResult.status} ${sourceResult.message}`
                : undefined
            }
          />
        )}
      </DetailShell>
    );
  }

  const accountsTotal = accountsResult.ok ? (accountsResult.total ?? null) : null;
  const accountsData = accountsResult.ok ? accountsResult.data : [];

  // Stat strip inputs (issue #184). On Overview we reuse the bigger sample
  // already fetched above. On other tabs we use the dedicated strip sample
  // (or fall back to whatever the tab fetch returned, which may be empty).
  const stripSampleAccounts =
    tab === "overview"
      ? accountsData
      : stripSampleResult && stripSampleResult.ok
        ? stripSampleResult.data
        : [];

  // Resolve identity profile by local match on `authoritativeSource.id`.
  // `/v2025/identities/{id}` doesn't embed the profile — same constraint
  // applies to `/v2025/sources/{id}`. The list endpoint is the only path.
  const matchedProfile =
    profilesResult.ok
      ? (profilesResult.data.find(
          (p) => p.authoritativeSource?.id === id,
        ) ?? null)
      : null;
  const identityProfileName = matchedProfile?.name ?? null;
  // Full identity profile object for the Overview side card. The list
  // endpoint exposes only the summary, so `lifecycleStatesCount` /
  // `defaultState` / `identitiesCount` are unknown until a richer fetch
  // is wired (left as `null` so the card renders `—` rather than a count
  // we can't justify).
  const identityProfileForOverview = matchedProfile
    ? {
        id: matchedProfile.id,
        name: matchedProfile.name,
        identitiesCount: null,
        lifecycleStatesCount: null,
        defaultState: null,
      }
    : null;

  const scheduleLabel = sourceResult.ok
    ? parseScheduleFromConnectorAttributes(
        sourceResult.data.connectorAttributes,
      )
    : null;

  const currentSearchParams = new URLSearchParams();
  if (tab !== "overview") currentSearchParams.set("tab", tab);
  if (tab === "accounts") {
    if (accountsPage > 1)
      currentSearchParams.set("accpage", String(accountsPage));
    if (accountsPer !== DEFAULT_ACCOUNTS_PER)
      currentSearchParams.set("accper", String(accountsPer));
  }

  const basePath = `/sailpoint/sources/${encodeURIComponent(id)}`;

  // Best-effort "is an aggregation in flight" derived from the source's
  // own `status` string — no extra round-trip. Disables the
  // Aggregate-now button to keep the UI honest, even though ISC
  // server-side rejects concurrent aggregations anyway.
  const isAggregating = isAggregationRunning({
    sourceId: id,
    healthy: sourceResult.data.healthy,
    status: sourceResult.data.status,
    since: sourceResult.data.since,
  });

  return (
    <DetailShell
      back={{ href: "/sailpoint/sources", label: "All sources" }}
      header={
        <SourceDetailHeader
          source={sourceResult.data}
          isAggregating={isAggregating}
        />
      }
      stats={
        <SourceStatStrip
          accountsTotal={accountsTotal}
          sampleAccounts={stripSampleAccounts}
          entitlementsTotal={entitlementsTotal}
          since={sourceResult.data.since ?? null}
          scheduleLabel={scheduleLabel}
          identityProfileName={identityProfileName}
        />
      }
      tabs={
        <Tabs
          size="md"
          value={tab}
          hrefFor={(k) =>
            k === "overview" ? basePath : `${basePath}?tab=${k}`
          }
          aria-label="Source sections"
          items={[
            { key: "overview", label: "Overview" },
            { key: "accounts", label: "Accounts", count: accountsTotal },
            {
              key: "schemas",
              label: "Schemas",
              count: schemasResult.ok ? schemasResult.data.length : null,
            },
          ]}
        />
      }
    >
      {tab === "overview" && (
        <SourceOverview
          source={sourceResult.data}
          identityProfile={identityProfileForOverview}
        />
      )}

      {tab === "accounts" &&
        (accountsResult.ok ? (
          <div className="space-y-4">
            <SourceAccountsTable
              data={accountsData.map(toAccountRow)}
            />
            <Pagination
              page={accountsPage}
              totalPages={Math.max(
                1,
                Math.ceil((accountsTotal ?? accountsData.length) / accountsPer),
              )}
              total={accountsTotal ?? accountsData.length}
              rangeStart={
                accountsData.length === 0
                  ? 0
                  : (accountsPage - 1) * accountsPer + 1
              }
              rangeEnd={Math.min(
                (accountsPage - 1) * accountsPer + accountsData.length,
                accountsTotal ?? accountsData.length,
              )}
              perPage={accountsPer}
              perPageOptions={ACCOUNTS_PAGE_SIZES}
              hrefForPage={(p) =>
                buildHref(basePath, currentSearchParams, {
                  accpage: p === 1 ? null : String(p),
                })
              }
              hrefForPerPage={(n) =>
                buildHref(basePath, currentSearchParams, {
                  accpage: null,
                  accper: n === DEFAULT_ACCOUNTS_PER ? null : String(n),
                })
              }
            />
          </div>
        ) : (
          <TabFailure
            status={accountsResult.status}
            resource="accounts"
            message={accountsResult.message}
          />
        ))}

      {tab === "schemas" &&
        (schemasResult.ok ? (
          <SourceSchemas
            sourceId={id}
            schemas={schemasResult.data}
            activeSchema={schemaParam}
            hrefForSchema={(name) =>
              buildHref(basePath, currentSearchParams, {
                tab: "schemas",
                schema: name,
              })
            }
          />
        ) : (
          <TabFailure
            status={schemasResult.status}
            resource="schemas"
            message={schemasResult.message}
          />
        ))}
    </DetailShell>
  );
}
