import Link from "next/link";
import { AlertTriangle, Database, KeyRound, ShieldCheck } from "lucide-react";

import { StatGroup, type StatItem } from "@/components/ui/stat-group";

export type SourcesKpis = {
  total: number | null;
  healthy: number | null;
  inError: number | null;
  authoritative: number | null;
  accountSources: number | null;
  /**
   * Global orphan accounts (uncorrelated). `undefined` when the
   * `/v2025/accounts?filters=uncorrelated eq true` count failed —
   * KPI renders "—" rather than 0 to avoid lying.
   */
  orphanAccounts: number | null;
};

/**
 * KPI strip rendered above the filters on the Sources list. Server-rendered
 * from `listSources(count:true, ...)` calls and one `countAccounts`
 * call (orphans). Each card degrades to "—" when its count is null.
 *
 * The "In error" card carries a deep link into the filtered list
 * (`?status=error`) so reviewers can act on the count directly.
 */
export function SourcesKpiStrip({ kpis }: { kpis: SourcesKpis }) {
  const total = kpis.total;
  const healthy = kpis.healthy;
  const greenPct =
    total && healthy !== null
      ? Math.round((healthy / total) * 100)
      : null;

  const totalSub = (() => {
    if (kpis.authoritative === null && kpis.accountSources === null) {
      return "All connected sources";
    }
    const parts: string[] = [];
    if (kpis.authoritative !== null) {
      parts.push(`${kpis.authoritative} authoritative`);
    }
    if (kpis.accountSources !== null) {
      parts.push(`${kpis.accountSources} account`);
    }
    return parts.join(" · ");
  })();

  const items: StatItem[] = [
    {
      label: "Total sources",
      value: total !== null ? total.toLocaleString() : "—",
      sub: totalSub,
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "Healthy",
      value:
        healthy !== null ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {healthy.toLocaleString()}
          </span>
        ) : (
          "—"
        ),
      sub: greenPct !== null ? `${greenPct}% green` : "Health unknown",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      label: "In error",
      value:
        kpis.inError !== null ? (
          <span
            className={
              kpis.inError > 0
                ? "text-rose-600 dark:text-rose-400"
                : undefined
            }
          >
            {kpis.inError.toLocaleString()}
          </span>
        ) : (
          "—"
        ),
      sub:
        kpis.inError !== null && kpis.inError > 0 ? (
          <Link
            href="/sailpoint/sources?status=error"
            className="text-primary hover:underline"
          >
            Review failing aggregations →
          </Link>
        ) : (
          "No failing aggregations"
        ),
      tone: kpis.inError !== null && kpis.inError > 0 ? "danger" : "default",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      label: "Orphan accounts",
      value:
        kpis.orphanAccounts !== null ? (
          <span
            className={
              kpis.orphanAccounts > 0
                ? "text-amber-600 dark:text-amber-400"
                : undefined
            }
          >
            {kpis.orphanAccounts.toLocaleString()}
          </span>
        ) : (
          "—"
        ),
      sub:
        kpis.orphanAccounts !== null
          ? kpis.orphanAccounts > 0
            ? "Uncorrelated to any identity"
            : "All accounts correlated"
          : "Count unavailable",
      tone:
        kpis.orphanAccounts !== null && kpis.orphanAccounts > 0
          ? "warning"
          : "default",
      icon: <KeyRound className="h-4 w-4" />,
    },
  ];

  return <StatGroup layout="grid" items={items} />;
}
