import Link from "next/link";
import { AlertTriangle, ShieldAlert, UserPlus, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type KpiCardProps = {
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  href?: string;
  tone?: "default" | "warning";
  icon?: React.ReactNode;
};

function KpiCard({ label, value, sub, href, tone = "default", icon }: KpiCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-lg border bg-card p-4 transition-colors",
        tone === "warning" &&
          "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
        href && "hover:border-foreground/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span
            className={cn(
              "text-muted-foreground/60",
              tone === "warning" && "text-amber-600 dark:text-amber-400",
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="text-3xl font-semibold leading-tight tracking-tight">
        {value}
      </div>
      {sub ? (
        <div className="text-xs text-muted-foreground">{sub}</div>
      ) : (
        <div className="h-4" aria-hidden />
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}

export type IdentityKpis = {
  total: number;
  active: number;
  pending: number;
  external: number;
  highRisk: number | null;
  awaitingOnboarding: number;
};

/**
 * KPI strip rendered above the filters. Each card is a server-rendered
 * derivative of one `countIdentities` call. The Risk card is omitted when
 * `highRisk` is `null` (the tenant doesn't expose `identityRiskScore`) —
 * the grid simply collapses to 3 columns, no "n/a" placeholder.
 */
export function IdentityKpiStrip({
  kpis,
  workforceDenominator,
}: {
  kpis: IdentityKpis;
  /** Denominator used for the external-percentage sub-line. Defaults to total. */
  workforceDenominator?: number;
}) {
  const denom = workforceDenominator ?? kpis.total;
  const extPct =
    denom > 0 ? Math.round((kpis.external / denom) * 100) : 0;

  const cards: KpiCardProps[] = [
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
    cards.push({
      label: "High risk",
      value: kpis.highRisk.toLocaleString(),
      tone: "warning",
      icon: <ShieldAlert className="h-4 w-4" />,
      sub: kpis.highRisk > 0 ? "Review recommended" : "Nothing flagged",
      href: kpis.highRisk > 0 ? "/identities?risk=high" : undefined,
    });
  }

  cards.push({
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

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}
