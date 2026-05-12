import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import {
  getIdentity,
  getIdentityAccess,
  getIdentityAccounts,
} from "@/lib/sailpoint/identities-api";

import { StateView } from "@/components/ui/state-view";
import { AccessTab } from "../_components/access-tab";
import { AccountsTab } from "../_components/accounts-tab";
import { AttributesTab } from "../_components/attributes-tab";
import { IdentityHeader } from "../_components/identity-header";

type TabId = "attributes" | "accounts" | "access";

const TABS: TabId[] = ["attributes", "accounts", "access"];

function tabFromParam(value: string | undefined): TabId {
  return (TABS as readonly string[]).includes(value ?? "")
    ? (value as TabId)
    : "attributes";
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

  // Fetch identity + accounts + access in parallel. Counter badges need
  // the count from every tab, so we eat the cost up front. Each call's
  // failure is contained to its own tab below; the only "fatal" path is
  // identity itself.
  const [identityResult, accountsResult, accessResult] = await Promise.all([
    getIdentity(userId, id),
    getIdentityAccounts(userId, id),
    getIdentityAccess(userId, id),
  ]);

  if (!identityResult.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
          <Link href="/identities">
            <ArrowLeft />
            All identities
          </Link>
        </Button>
        {identityResult.status === 403 ? (
          <div className="pt-2">
            <PermissionDenied resource="this identity" />
          </div>
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
      </div>
    );
  }

  const accountsCount = accountsResult.ok ? accountsResult.data.length : null;
  const accessCount = accessResult.ok ? accessResult.data.length : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link href="/identities">
          <ArrowLeft />
          All identities
        </Link>
      </Button>

      <IdentityHeader identity={identityResult.data} />

      <Tabs
        size="md"
        value={tab}
        hrefFor={(k) => `?tab=${k}`}
        aria-label="Identity sections"
        items={[
          { key: "attributes", label: "Attributes" },
          { key: "accounts", label: "Accounts", count: accountsCount },
          { key: "access", label: "Access", count: accessCount },
        ]}
      />

      <div className="pt-2">
        {tab === "attributes" && (
          <AttributesTab identity={identityResult.data} />
        )}
        {tab === "accounts" &&
          (accountsResult.ok ? (
            <div className="pt-2">
              <AccountsTab accounts={accountsResult.data} />
            </div>
          ) : (
            <div className="pt-4">
              <TabFailure
                status={accountsResult.status}
                resource="accounts"
                message={accountsResult.message}
              />
            </div>
          ))}
        {tab === "access" &&
          (accessResult.ok ? (
            <AccessTab items={accessResult.data} />
          ) : (
            <div className="pt-4">
              <TabFailure
                status={accessResult.status}
                resource="access items"
                message={accessResult.message}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
