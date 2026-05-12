import Link from "next/link";

import { cn } from "@/lib/utils";

import { AvatarInitials } from "./avatar-initials";

/**
 * Identity-detail KPI strip — four cells fused into a single bordered
 * container, vertical dividers between cells (matches the mockup density).
 *
 * The set of cells is deliberately narrower than the design mockup. We
 * dropped the "Last login (via Workday SSO)" cell because ISC doesn't
 * track per-app SSO logins from a federated IdP — only the console
 * login on its own surface, which is not what the label implied.
 * See `vault/Projects/Simplified Identity/2026-05-12-identity-detail-redesign.md`.
 *
 * Typography mirrors the mockup density: values stay at `text-2xl` for
 * numerics and `text-base font-medium` for the Manager name (which is
 * text, not a tally — sizing a long name as a 3xl headline reads as a
 * UI bug). No icons in the cells; the labels carry the meaning.
 */

export type StatsStripData = {
  accountsCount: number | null;
  /** Unique source count derived from the accounts list. */
  sourcesCount: number | null;
  accessCount: number | null;
  managerHref: string | null;
  managerName: string | null;
  createdAt?: string;
  /** Optional joined-on override (e.g. hireDate). Falls back to createdAt. */
  joinedAt?: string;
};

function formatTenure(fromIso: string | undefined): {
  value: string;
  joinedOn: string | null;
} | null {
  if (!fromIso) return null;
  const then = new Date(fromIso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  const joinedOn = fromIso.slice(0, 10);
  if (days < 31) return { value: `${days}d`, joinedOn };
  if (days < 365) return { value: `${Math.round(days / 30)}mo`, joinedOn };
  return { value: `${(days / 365).toFixed(1)}y`, joinedOn };
}

/**
 * One cell inside the fused strip. Borderless by itself — the parent
 * container draws the outer frame and the vertical dividers come from
 * a `divide-x` on the grid. Hover only nudges the background so the
 * dividers stay visually continuous.
 */
function Cell({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col gap-1.5 px-5 py-4",
        href && "transition-colors hover:bg-muted/40",
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 text-2xl font-semibold leading-tight tracking-tight">
        {value}
      </div>
      <div className="truncate text-xs text-muted-foreground">
        {sub ?? <span aria-hidden>&nbsp;</span>}
      </div>
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

function dash(n: number | null): string {
  return n === null ? "—" : n.toLocaleString();
}

export function IdentityStatsStrip({ data }: { data: StatsStripData }) {
  const tenure = formatTenure(data.joinedAt ?? data.createdAt);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <Cell
          label="Accounts"
          value={dash(data.accountsCount)}
          sub={
            data.accountsCount === null
              ? "—"
              : data.sourcesCount !== null && data.sourcesCount > 0
                ? `across ${data.sourcesCount.toLocaleString()} source${data.sourcesCount === 1 ? "" : "s"}`
                : "no correlated sources"
          }
        />
        <Cell
          label="Entitlements"
          value={dash(data.accessCount)}
          sub="roles · access profiles · entitlements"
        />
        <Cell
          label="Tenure"
          value={tenure ? tenure.value : "—"}
          sub={tenure?.joinedOn ? `joined ${tenure.joinedOn}` : "—"}
        />
        {data.managerName && data.managerHref ? (
          <Cell
            label="Manager"
            value={
              <span className="flex min-w-0 items-center gap-2 text-base font-medium leading-tight">
                <AvatarInitials
                  name={data.managerName}
                  className="h-5 w-5 text-[9px]"
                />
                <span className="truncate">{data.managerName}</span>
              </span>
            }
            sub="reports to"
            href={data.managerHref}
          />
        ) : (
          <Cell
            label="Manager"
            value={
              <span className="text-base font-medium text-muted-foreground">
                —
              </span>
            }
            sub="no manager on identity"
          />
        )}
      </div>
    </div>
  );
}
