import { Box } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { IdentityAccount } from "@/lib/sailpoint/identities-api";

import { AccountRowActions } from "./account-row-actions";

/**
 * Accounts tab — flat table of linked accounts (one row per account).
 *
 * SailPoint-faithful status mapping:
 *  - `locked: true`             → "Locked"   (rose)
 *  - `disabled: true`           → "Disabled" (amber)
 *  - otherwise                  → "Active"   (emerald)
 *
 * We do *not* show a "Pending" status as in the design mockup — ISC does
 * not surface a `pending` state on the account payload. The closest
 * primitive (`disabled`) maps to "Disabled" instead.
 *
 * `Authoritative` is shown as a small secondary pill next to the status
 * because it's a useful signal (it's the source of truth for the identity)
 * and is exposed by ISC directly.
 *
 * Sort: most recently synced first (`modified` desc), which matches the
 * admin's mental model — what changed today is what they want to triage.
 */

function relativeTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000)
    return rtf.format(Math.round(seconds / 2_592_000), "month");
  return rtf.format(Math.round(seconds / 31_536_000), "year");
}

function StatusPill({ account }: { account: IdentityAccount }) {
  if (account.locked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
        Locked
      </span>
    );
  }
  if (account.disabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      Active
    </span>
  );
}

export function AccountsTab({ accounts }: { accounts: IdentityAccount[] }) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-md border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No correlated accounts on this identity yet.
      </div>
    );
  }

  const sourcesCount = new Set(
    accounts.map((a) => a.sourceId || a.sourceName),
  ).size;

  // Most recently synced first; fall back to authoritative pinning then name.
  const sorted = [...accounts].sort((a, b) => {
    const am = a.modified ? new Date(a.modified).getTime() : 0;
    const bm = b.modified ? new Date(b.modified).getTime() : 0;
    if (am !== bm) return bm - am;
    if (a.authoritative !== b.authoritative) return a.authoritative ? -1 : 1;
    return (a.sourceName ?? "").localeCompare(b.sourceName ?? "");
  });

  return (
    <div className="pt-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <header className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
          <h2 className="text-sm font-medium">Linked accounts</h2>
          <p className="text-xs text-muted-foreground">
            {accounts.length.toLocaleString()} account
            {accounts.length === 1 ? "" : "s"} across{" "}
            {sourcesCount.toLocaleString()} connected source
            {sourcesCount === 1 ? "" : "s"}
          </p>
        </header>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10" aria-label="Icon" />
              <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Source
              </TableHead>
              <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Account name
              </TableHead>
              <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Last sync
              </TableHead>
              <TableHead className="w-10" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((account) => {
              const accountName =
                account.nativeIdentity ?? account.name ?? account.id;
              const sourceName = account.sourceName || "Unknown source";
              const lastSync = relativeTime(account.modified);
              return (
                <TableRow key={account.id}>
                  <TableCell className="text-muted-foreground/60">
                    <Box className="h-4 w-4" aria-hidden />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {sourceName}
                      </span>
                      {account.authoritative && (
                        <span
                          className={cn(
                            "rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
                          )}
                          title="Authoritative source for this identity"
                        >
                          Authoritative
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {accountName}
                  </TableCell>
                  <TableCell>
                    <StatusPill account={account} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lastSync ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AccountRowActions
                      sourceName={sourceName}
                      accountName={accountName}
                      attributes={account.attributes ?? {}}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
