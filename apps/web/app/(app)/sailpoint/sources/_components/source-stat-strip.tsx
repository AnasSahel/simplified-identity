import { Activity, Clock, Database, Layers, UserCircle } from "lucide-react";

import { Pill } from "@/components/ui/pill";
import { StatGroup, type StatItem } from "@/components/ui/stat-group";
import type { SourceAccount } from "@/lib/sailpoint/sources-api";

/**
 * `<SourceStatStrip>` — 5-stat horizontal strip rendered above the
 * source detail tabs (issue #184). Reuses the `<StatGroup layout="inline">`
 * primitive so spacing, dividers, and small-viewport collapse stay
 * consistent with other detail pages.
 *
 * Data shape is intentionally pre-resolved upstream (in `page.tsx`) so
 * this component stays a pure formatter — no fetches, no async work,
 * no error branches. Missing values render as `—` per design contract.
 */

const NUMBER_FMT = new Intl.NumberFormat("en-US");
const DATETIME_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export type SourceStatStripProps = {
  /** Total accounts on the source (from `count=true`). `null` if the call failed. */
  accountsTotal: number | null;
  /**
   * Sample of accounts already fetched for the Overview tab. We don't
   * re-fetch — `correlated` and `orphans` are derived from the same
   * sample the Overview KPIs use, so the two stay numerically aligned.
   */
  sampleAccounts: SourceAccount[];
  /** Result of `countEntitlements({ sourceId })`. Always a number — failures collapse to `0`. */
  entitlementsTotal: number;
  /** `source.since` — ISO timestamp of the last health flip / aggregation. */
  since: string | null;
  /** Best-effort schedule label parsed from `connectorAttributes`. `null` if unparseable. */
  scheduleLabel: string | null;
  /** Identity profile name resolved via local match on `authoritativeSource.id`. */
  identityProfileName: string | null;
};

export function SourceStatStrip({
  accountsTotal,
  sampleAccounts,
  entitlementsTotal,
  since,
  scheduleLabel,
  identityProfileName,
}: SourceStatStripProps) {
  const correlated = sampleAccounts.filter((a) => Boolean(a.identityId)).length;
  const orphans = Math.max(0, sampleAccounts.length - correlated);

  const items: StatItem[] = [
    {
      label: "Accounts",
      value:
        accountsTotal !== null ? NUMBER_FMT.format(accountsTotal) : "—",
      sub:
        sampleAccounts.length > 0
          ? `${NUMBER_FMT.format(correlated)} correlated · ${NUMBER_FMT.format(orphans)} orphans`
          : "No accounts to sample",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "Entitlements",
      value: NUMBER_FMT.format(entitlementsTotal),
      sub: "On this source",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: "Last aggregation",
      value: since ? formatRelative(since) : "—",
      sub: since ? <LastAggregationSub since={since} /> : "Never run",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Schedule",
      value: scheduleLabel ?? "—",
      sub: scheduleLabel ? "Configured" : "Not configured",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Identity profile",
      value: identityProfileName ?? "—",
      sub: identityProfileName ? "Authoritative" : "None matched",
      icon: <UserCircle className="h-4 w-4" />,
    },
  ];

  return <StatGroup layout="inline" items={items} />;
}

function LastAggregationSub({ since }: { since: string }) {
  const t = new Date(since).getTime();
  if (Number.isNaN(t)) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Pill tone="success" dot>
        Succeeded
      </Pill>
      <span
        className="text-muted-foreground/80"
        title={DATETIME_FMT.format(new Date(t))}
      >
        {DATETIME_FMT.format(new Date(t))}
      </span>
    </span>
  );
}

/**
 * Tiny relative-time formatter — mirrors the one in `<SourceOverview>`.
 * Kept inline rather than extracted to avoid a shared module dance for a
 * 15-line helper used in two places (will refactor when a 3rd consumer
 * lands).
 */
function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  const remSec = sec - min * 60;
  if (min < 60)
    return remSec > 0 && min < 10
      ? `${min}m ${remSec}s ago`
      : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

// Schedule parsing helper now lives in `source-config-helpers.ts` (shared
// with `<SourceOverview>`). Re-exported here so existing call sites
// (`page.tsx`) keep their import path until they're migrated.
export { parseScheduleFromConnectorAttributes } from "./source-config-helpers";
