import { StatGroup, type StatItem } from "@/components/ui/stat-group";

import { AvatarInitials } from "./avatar-initials";

/**
 * Identity-detail KPI strip — four cells fused into a single bordered
 * container with vertical dividers. Thin domain adapter over the
 * `<StatGroup layout="inline">` primitive (DESIGN.md §2.8).
 *
 * The cell set is deliberately narrower than the original design mockup.
 * We dropped the "Last login (via Workday SSO)" cell because ISC doesn't
 * track per-app SSO logins from a federated IdP — only the console login
 * on its own surface, which is not what the label implied.
 * See `vault/Projects/Simplified Identity/2026-05-12-identity-detail-redesign.md`.
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

function dash(n: number | null): string {
  return n === null ? "—" : n.toLocaleString();
}

export function IdentityStatsStrip({ data }: { data: StatsStripData }) {
  const tenure = formatTenure(data.joinedAt ?? data.createdAt);

  const items: StatItem[] = [
    {
      label: "Accounts",
      value: dash(data.accountsCount),
      sub:
        data.accountsCount === null
          ? "—"
          : data.sourcesCount !== null && data.sourcesCount > 0
            ? `across ${data.sourcesCount.toLocaleString()} source${data.sourcesCount === 1 ? "" : "s"}`
            : "no correlated sources",
    },
    {
      label: "Entitlements",
      value: dash(data.accessCount),
      sub: "roles · access profiles · entitlements",
    },
    {
      label: "Tenure",
      value: tenure ? tenure.value : "—",
      sub: tenure?.joinedOn ? `joined ${tenure.joinedOn}` : "—",
    },
  ];

  // The Manager cell carries a name, not a tally. The primitive's value
  // wrapper is `text-3xl font-semibold` (sized for numerics); the inner
  // span overrides with `text-base font-medium` so a long name doesn't
  // render as a UI bug.
  if (data.managerName && data.managerHref) {
    items.push({
      label: "Manager",
      value: (
        <span className="flex min-w-0 items-center gap-2 text-base font-medium leading-tight">
          <AvatarInitials
            name={data.managerName}
            className="h-5 w-5 text-[9px]"
          />
          <span className="truncate">{data.managerName}</span>
        </span>
      ),
      sub: "reports to",
      href: data.managerHref,
    });
  } else {
    items.push({
      label: "Manager",
      value: (
        <span className="text-base font-medium text-muted-foreground">—</span>
      ),
      sub: "no manager on identity",
    });
  }

  return <StatGroup layout="inline" items={items} />;
}
