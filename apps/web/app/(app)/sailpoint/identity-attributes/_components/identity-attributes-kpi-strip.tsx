import { Activity, EyeOff, List, Search } from "lucide-react";

import { StatGroup, type StatItem } from "@/components/ui/stat-group";

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
   * Count of attributes flagged drifting (null-population beyond threshold).
   * `null` until #207 implements the drift detector — card renders
   * "—" + "Coming soon" in that state.
   */
  driftCount: number | null;
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
      // TODO(#207): wire `driftCount` once the null-population drift detector
      // ships. The threshold (% null) lives in that ADR — this card just
      // displays the produced count.
      value: kpis.driftCount !== null ? kpis.driftCount.toLocaleString() : "—",
      tone: "danger",
      icon: <Activity className="h-4 w-4" />,
      sub:
        kpis.driftCount !== null && kpis.driftCount > 0
          ? "Attributes with null values →"
          : kpis.driftCount === null
            ? "Coming soon"
            : "Nothing flagged",
      href:
        kpis.driftCount !== null && kpis.driftCount > 0
          ? "/sailpoint/identity-attributes?scope=drift"
          : undefined,
    },
  ];

  return <StatGroup layout="inline" items={items} />;
}
