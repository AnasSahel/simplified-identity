import { EyeOff, List, Search } from "lucide-react";

import { StatGroup, type StatItem } from "@/components/ui/stat-group";

import { DriftRefreshIconButton } from "./drift-refresh-icon-button";

/**
 * Relative time formatter for the drift snapshot age. Server-rendered
 * against `capturedAt`; updates on the page's next render after a
 * successful refresh (the action calls `revalidatePath`). Kept inline
 * here instead of `lib/` because it's a one-call surface tied to the
 * drift card's UX — no other place needs the same formatting.
 */
function formatRelative(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.max(0, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * KPI strip rendered above the filters on the Identity Attributes list.
 * Server-rendered from the same `listIdentityAttributes` result the table
 * consumes — no extra SailPoint call for cards 1 + 2.
 *
 * Cards 3 (Unused) and 4 (Drift) are gated on backend detection that
 * hasn't shipped yet (#206 + #207). Until those land, this strip renders
 * "—" with a "Coming soon" sub-line. When `unusedCount` becomes a number
 * the card flips to its active state (count + filter CTA → `?scope=unused`).
 *
 * Layout matches the identity-list KPI strip (inline) so the page-top
 * surface reads as one continuous design language across listings.
 * Inline layout auto-collapses to a 1- or 2-col grid below `sm` (see
 * `StatGroup` PR #170).
 */
export type IdentityAttributesKpis = {
  total: number;
  standardCount: number;
  customCount: number;
  searchableCount: number;
  /**
   * Count of attributes flagged unused. `null` until #206 wires the
   * snapshot fetch — card renders "—" + "Coming soon" in that state.
   */
  unusedCount: number | null;
  /**
   * Count of attributes flagged drifting (tier IN warning|danger).
   * `null` until the drift snapshot has been refreshed once — card
   * renders "—" + "No drift snapshot yet" in that state.
   */
  driftCount: number | null;
  /** Per-tier breakdown, surfaced on the card sub-line. */
  driftWarningCount?: number;
  driftDangerCount?: number;
  /**
   * Timestamp of the latest drift snapshot row, or `null` if the admin
   * hasn't refreshed yet. Renders as a secondary sub-line on card 4
   * ("Snapshot from 7s ago") next to the in-card refresh control.
   */
  driftCapturedAt: Date | null;
};

export function IdentityAttributesKpiStrip({
  kpis,
}: {
  kpis: IdentityAttributesKpis;
}) {
  const items: StatItem[] = [
    {
      label: "Total attributes",
      value: kpis.total.toLocaleString(),
      icon: <List className="h-4 w-4" />,
      sub:
        kpis.total > 0
          ? `${kpis.standardCount.toLocaleString()} standard · ${kpis.customCount.toLocaleString()} custom`
          : "No attributes defined",
    },
    {
      label: "Searchable",
      value: kpis.searchableCount.toLocaleString(),
      icon: <Search className="h-4 w-4" />,
      sub: "Indexed for filters & search",
    },
    {
      label: "Unused",
      tooltip:
        "No identity profile maps this attribute AND no transform reads it. Safe to delete — pollutes filters/search elsewhere.",
      // TODO(#206): wire `unusedCount` from `getIdentityAttributesUsageSnapshot`
      // once that backend ships. Until then, card stays in "Coming soon" state.
      value: kpis.unusedCount !== null ? kpis.unusedCount.toLocaleString() : "—",
      tone: "warning",
      icon: <EyeOff className="h-4 w-4" />,
      sub:
        kpis.unusedCount !== null && kpis.unusedCount > 0
          ? "Review unused attributes →"
          : kpis.unusedCount === null
            ? "Coming soon"
            : "Nothing flagged",
      // Clickable only when count is a real number — placeholder card is
      // not a link (no scope to filter to yet).
      href:
        kpis.unusedCount !== null && kpis.unusedCount > 0
          ? "/sailpoint/identity-attributes?scope=unused"
          : undefined,
    },
    {
      label: "Drift",
      tooltip:
        "Tiered null-population ratio scoped to identity profiles that map the attribute. Warning at 5-20% null, danger above 20%.",
      value: kpis.driftCount !== null ? kpis.driftCount.toLocaleString() : "—",
      tone: "danger",
      // `headerAction` replaces the metric icon — the refresh button is
      // the load-bearing affordance for this card and shouldn't compete
      // with a decorative `Activity` icon for the same slot.
      headerAction: (
        <DriftRefreshIconButton hasSnapshot={kpis.driftCapturedAt !== null} />
      ),
      // Primary sub-line: per-tier breakdown when we have a snapshot,
      // "No drift snapshot yet" placeholder otherwise.
      sub:
        kpis.driftCount === null
          ? "No drift snapshot yet"
          : kpis.driftCount === 0
            ? "Nothing flagged"
            : `${(kpis.driftWarningCount ?? 0).toLocaleString()} warning · ${(kpis.driftDangerCount ?? 0).toLocaleString()} danger`,
      // Secondary sub-line: snapshot age (only rendered once a snapshot
      // exists — the primary sub-line already says "No drift snapshot
      // yet" in the absent case).
      secondarySubline: kpis.driftCapturedAt
        ? `Snapshot from ${formatRelative(kpis.driftCapturedAt)}`
        : null,
      href:
        kpis.driftCount !== null && kpis.driftCount > 0
          ? "/sailpoint/identity-attributes?scope=drift"
          : undefined,
    },
  ];

  return <StatGroup layout="inline" items={items} />;
}
