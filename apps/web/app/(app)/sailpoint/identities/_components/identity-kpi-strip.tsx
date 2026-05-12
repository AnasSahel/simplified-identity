import { AlertTriangle, ShieldAlert, UserPlus, Users } from "lucide-react";

import { StatGroup, type StatItem } from "@/components/ui/stat-group";

export type IdentityKpis = {
  total: number;
  active: number;
  pending: number;
  external: number;
  highRisk: number | null;
  awaitingOnboarding: number;
};

/**
 * KPI strip rendered above the filters. Server-rendered from
 * `countIdentities` calls. The Risk card is omitted when `highRisk` is
 * `null` (tenant doesn't expose `identityRiskScore`).
 *
 * Uses the inline `StatGroup` layout — same surface as the identity
 * detail header so KPI rows look like one continuous design language
 * across listing and detail pages. Inline ignores per-cell `tone`, so
 * High risk no longer carries a rose tint; the danger semantic is
 * read from the label + icon instead.
 */
export function IdentityKpiStrip({
  kpis,
  workforceDenominator,
}: {
  kpis: IdentityKpis;
  /** Denominator for the external-percentage sub-line. Defaults to total. */
  workforceDenominator?: number;
}) {
  const denom = workforceDenominator ?? kpis.total;
  const extPct = denom > 0 ? Math.round((kpis.external / denom) * 100) : 0;

  const items: StatItem[] = [
    {
      label: "Total identities",
      value: kpis.total.toLocaleString(),
      icon: <Users className="h-4 w-4" />,
      sub:
        kpis.total > 0 ? (
          <>
            <span>{kpis.active.toLocaleString()} active</span>
            <span aria-hidden> · </span>
            <span>{kpis.pending.toLocaleString()} pending</span>
          </>
        ) : (
          "No identities aggregated yet"
        ),
    },
    {
      label: "External / contractors",
      value: kpis.external.toLocaleString(),
      icon: <UserPlus className="h-4 w-4" />,
      sub: denom > 0 ? `${extPct}% of workforce` : "—",
    },
  ];

  if (kpis.highRisk !== null) {
    items.push({
      label: "High risk",
      value: kpis.highRisk.toLocaleString(),
      tone: "danger",
      icon: <ShieldAlert className="h-4 w-4" />,
      sub: kpis.highRisk > 0 ? "Review recommended" : "Nothing flagged",
      href: kpis.highRisk > 0 ? "/identities?risk=high" : undefined,
    });
  }

  items.push({
    label: "Awaiting onboarding",
    value: kpis.awaitingOnboarding.toLocaleString(),
    icon: <AlertTriangle className="h-4 w-4" />,
    sub:
      kpis.awaitingOnboarding > 0
        ? "Pre-board lifecycle state"
        : "No identities awaiting onboarding",
    href:
      kpis.awaitingOnboarding > 0 ? "/identities?lcs=prehire" : undefined,
  });

  return <StatGroup layout="inline" items={items} />;
}
