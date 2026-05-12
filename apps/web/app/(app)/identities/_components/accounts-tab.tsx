import { cn } from "@/lib/utils";
import type { IdentityAccount } from "@/lib/sailpoint/identities-api";

function StatusBadge({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "rose" | "neutral";
  children: React.ReactNode;
}) {
  const palette: Record<typeof tone, string> = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
    neutral: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        palette[tone],
      )}
    >
      {children}
    </span>
  );
}

function AccountRow({ account }: { account: IdentityAccount }) {
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
        <span className="font-mono text-xs text-foreground">
          {account.nativeIdentity ?? account.name ?? account.id}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {account.disabled ? (
            <StatusBadge tone="amber">Disabled</StatusBadge>
          ) : (
            <StatusBadge tone="emerald">Enabled</StatusBadge>
          )}
          {account.locked && <StatusBadge tone="rose">Locked</StatusBadge>}
          {account.authoritative && (
            <StatusBadge tone="neutral">Authoritative</StatusBadge>
          )}
          <span className="ml-2 text-xs text-muted-foreground transition-transform group-open:rotate-90">
            ▸
          </span>
        </span>
      </summary>
      <div className="border-t bg-muted/30 px-4 py-3">
        <pre className="overflow-x-auto rounded bg-background p-3 text-[11px] leading-relaxed">
          {JSON.stringify(account.attributes ?? {}, null, 2)}
        </pre>
      </div>
    </details>
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

  // Group by source so a user with many accounts can scan.
  const grouped = new Map<string, { sourceName: string; rows: IdentityAccount[] }>();
  for (const acc of accounts) {
    const key = acc.sourceId || acc.sourceName || "_unknown";
    const entry = grouped.get(key);
    if (entry) {
      entry.rows.push(acc);
    } else {
      grouped.set(key, {
        sourceName: acc.sourceName || "Unknown source",
        rows: [acc],
      });
    }
  }

  const groups = Array.from(grouped.values()).sort((a, b) =>
    a.sourceName.localeCompare(b.sourceName),
  );

  return (
    <div className="space-y-4 pt-4">
      {groups.map((group) => (
        <section key={group.sourceName} className="space-y-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.sourceName}{" "}
            <span className="text-muted-foreground/70">
              ({group.rows.length})
            </span>
          </h2>
          <div className="overflow-hidden rounded-md border bg-card">
            {group.rows.map((acc) => (
              <AccountRow key={acc.id} account={acc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
