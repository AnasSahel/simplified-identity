import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  getIdentity,
  getIdentityAccess,
  getIdentityAccounts,
} from "@/lib/sailpoint/identities-api";
import { cn } from "@/lib/utils";

import { SailpointEmptyState } from "../../_components/sailpoint-empty-state";
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
    <div className="rounded-md border border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
      You don&apos;t have permission to read {resource} on this tenant. Ask
      an administrator to grant the corresponding ISC scope.
    </div>
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
    <div className="rounded-md border border-dashed border-rose-300 bg-rose-50/40 px-4 py-6 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      Couldn&apos;t load {resource}: {status > 0 ? `${status} · ` : ""}
      {message}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function CountBadge({ value }: { value: number | null }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
      {value === null ? "—" : value}
    </span>
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
          <SailpointEmptyState
            reason={
              identityResult.status === 0
                ? "not_connected"
                : identityResult.status === 401
                  ? "auth_failed"
                  : "api_error"
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

      <nav className="flex gap-6 border-b" aria-label="Identity sections">
        <TabLink href={`?tab=attributes`} active={tab === "attributes"}>
          Attributes
        </TabLink>
        <TabLink href={`?tab=accounts`} active={tab === "accounts"}>
          Accounts <CountBadge value={accountsCount} />
        </TabLink>
        <TabLink href={`?tab=access`} active={tab === "access"}>
          Access <CountBadge value={accessCount} />
        </TabLink>
      </nav>

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
