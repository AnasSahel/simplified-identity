import { headers } from "next/headers";

import { StateView } from "@/components/ui/state-view";
import { Tabs } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import {
  getIdentity,
  getIdentityAccess,
  getIdentityAccounts,
  getIdentityProfileLifecycleStates,
} from "@/lib/sailpoint/identities-api";

import { DetailShell } from "../../../_components/detail-shell";
import { AccessTab } from "../_components/access-tab";
import { AccountsTab } from "../_components/accounts-tab";
import { AttributesTab } from "../_components/attributes-tab";
import { IdentityHeader } from "../_components/identity-header";
import { IdentityOverview } from "../_components/identity-overview";
import { IdentityStatsStrip } from "../_components/identity-stats-strip";

type TabId = "overview" | "accounts" | "entitlements" | "attributes";

const TABS: TabId[] = ["overview", "accounts", "entitlements", "attributes"];

function tabFromParam(value: string | undefined): TabId {
  return (TABS as readonly string[]).includes(value ?? "")
    ? (value as TabId)
    : "overview";
}

/**
 * Per-tab "no permission" message. A 403 on one endpoint shouldn't break
 * the rest of the page — the issue calls this out explicitly.
 */
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


export default async function IdentityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const tab = tabFromParam(tabParam);
  const userId = session.user.id;

  // Fetch identity + accounts + access in parallel. The Overview + KPI strip
  // need counts from accounts/access, so we eat the cost up front. Each
  // call's failure is contained to its own tab below; the only "fatal"
  // path is identity itself.
  const [identityResult, accountsResult, accessResult] = await Promise.all([
    getIdentity(userId, id),
    getIdentityAccounts(userId, id),
    getIdentityAccess(userId, id),
  ]);

  if (!identityResult.ok) {
    return (
      <DetailShell
        back={{ href: "/sailpoint/identities", label: "All identities" }}
        header={null}
      >
        {identityResult.status === 403 ? (
          <PermissionDenied resource="this identity" />
        ) : (
          <StateView
            intent={
              identityResult.status === 0
                ? "not_connected"
                : identityResult.status === 401
                  ? "auth_failed"
                  : "api_error"
            }
            title={
              identityResult.status === 0
                ? "Connect your SailPoint tenant"
                : identityResult.status === 401
                  ? "SailPoint session expired"
                  : "SailPoint API error"
            }
            description={
              identityResult.status === 0
                ? "Sign in with SailPoint to load this identity from your tenant."
                : identityResult.status === 401
                  ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                  : "The request failed. Try again, or contact your administrator if it persists."
            }
            detail={
              identityResult.status >= 400
                ? `${identityResult.status} ${identityResult.message}`
                : undefined
            }
          />
        )}
      </DetailShell>
    );
  }

  const accountsCount = accountsResult.ok ? accountsResult.data.length : null;
  const accessCount = accessResult.ok ? accessResult.data.length : null;
  const sourcesCount = accountsResult.ok
    ? new Set(accountsResult.data.map((a) => a.sourceId)).size
    : null;
  // The authoritative source feeds the identity attributes upstream. ISC
  // flags one account per identity as `authoritative: true`; we surface
  // its source name in the Profile card and as a pill in the Accounts row.
  const authoritativeSourceName = accountsResult.ok
    ? (accountsResult.data.find((a) => a.authoritative)?.sourceName ?? null)
    : null;

  // Fetch the LCS catalog only on Overview (the only tab that renders it).
  // Sequential after `identity` because the profile id comes from the
  // identity payload — cheap (~one round-trip) and skipped on other tabs.
  const profileId = identityResult.data.identityProfile?.id ?? null;
  const profileLifecycleStatesResult =
    tab === "overview" && profileId
      ? await getIdentityProfileLifecycleStates(userId, profileId)
      : null;

  return (
    <DetailShell
      back={{ href: "/sailpoint/identities", label: "All identities" }}
      header={
        <>
          <IdentityHeader identity={identityResult.data} />
          <div className="py-5">
            <IdentityStatsStrip
              data={{
                accountsCount,
                sourcesCount,
                accessCount,
                managerName: identityResult.data.managerRef?.name ?? null,
                managerHref: identityResult.data.managerRef
                  ? `/identities/${encodeURIComponent(identityResult.data.managerRef.id)}`
                  : null,
                createdAt: identityResult.data.created,
              }}
            />
          </div>
        </>
      }
      tabs={
        <Tabs
          size="md"
          value={tab}
          hrefFor={(k) => `?tab=${k}`}
          aria-label="Identity sections"
          items={[
            { key: "overview", label: "Overview" },
            { key: "accounts", label: "Accounts", count: accountsCount },
            { key: "entitlements", label: "Entitlements", count: accessCount },
            { key: "attributes", label: "Attributes" },
          ]}
        />
      }
    >
      {tab === "overview" && (
        <IdentityOverview
          identity={identityResult.data}
          authoritativeSourceName={authoritativeSourceName}
          profileLifecycleStatesResult={profileLifecycleStatesResult}
        />
      )}
      {tab === "attributes" && (
        <AttributesTab identity={identityResult.data} />
      )}
      {tab === "accounts" &&
        (accountsResult.ok ? (
          <AccountsTab accounts={accountsResult.data} />
        ) : (
          <TabFailure
            status={accountsResult.status}
            resource="accounts"
            message={accountsResult.message}
          />
        ))}
      {tab === "entitlements" &&
        (accessResult.ok ? (
          <AccessTab items={accessResult.data} />
        ) : (
          <TabFailure
            status={accessResult.status}
            resource="access items"
            message={accessResult.message}
          />
        ))}
    </DetailShell>
  );
}
