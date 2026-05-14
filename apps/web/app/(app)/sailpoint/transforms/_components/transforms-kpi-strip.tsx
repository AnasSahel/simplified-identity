import { CheckCircle2, EyeOff, List } from "lucide-react";

import { StatGroup, type StatItem } from "@/components/ui/stat-group";

/**
 * KPI strip rendered above the toolbar on the Transforms list.
 *
 * Server-rendered from the same `/v2025/transforms` payload the table
 * consumes — no extra SailPoint call. Counts reflect the *visible*
 * (post-filter) set so the numbers move with the user's filtering, in
 * the same way the Identity attributes drift card moves with its scope.
 *
 * Layout matches the Identity attributes header (#205) — `inline`
 * `<StatGroup>` with `divide-x` separators, prominent number, uppercase
 * eyebrow label, action icon top-right per cell — so the page-top
 * surface reads as one continuous design language across listings.
 *
 * Card 4 (Issues) is intentionally out of scope here — it ships with
 * #310 as a sibling card next to this one. The mockup at the repo root
 * shows it for context; we don't render a placeholder.
 */
export type TransformsKpis = {
  total: number;
  builtinCount: number;
  customCount: number;
  inUseCount: number;
  unusedCount: number;
  /**
   * `false` when the usages roll-up couldn't be computed (identity
   * profiles + sources fan-out all timed out). Cards 2 and 3 then
   * render "—" with a "Usages unavailable" sub-line, matching the
   * "Coming soon" graceful-degradation pattern of the Identity
   * attributes strip.
   */
  usagesAvailable: boolean;
};

export function TransformsKpiStrip({ kpis }: { kpis: TransformsKpis }) {
  const items: StatItem[] = [
    {
      label: "Total transforms",
      value: kpis.total.toLocaleString(),
      icon: <List className="h-4 w-4" />,
      sub:
        kpis.total > 0
          ? `${kpis.builtinCount.toLocaleString()} built-in · ${kpis.customCount.toLocaleString()} custom`
          : "No transforms defined",
    },
    {
      label: "In use",
      tooltip:
        "Transforms referenced by at least one identity attribute or source provisioning policy on the connected tenant.",
      value: kpis.usagesAvailable ? kpis.inUseCount.toLocaleString() : "—",
      icon: <CheckCircle2 className="h-4 w-4" />,
      sub: kpis.usagesAvailable
        ? "Referenced in attributes & sources"
        : "Usages unavailable",
    },
    {
      label: "Unused",
      tooltip:
        "Transforms not referenced by any identity attribute or source provisioning policy. Safe to delete — pollutes the list and search elsewhere.",
      value: kpis.usagesAvailable ? kpis.unusedCount.toLocaleString() : "—",
      tone: "warning",
      icon: <EyeOff className="h-4 w-4" />,
      sub: !kpis.usagesAvailable
        ? "Usages unavailable"
        : kpis.unusedCount > 0
          ? "Review unused transforms →"
          : "Nothing flagged",
      // Clickable only when the count is real and non-zero — a "0"
      // card linking to itself would be a dead-end. The link lands
      // on `?usages=0`, which the page parses into the binary
      // `UsagesFilter` chip (active state) and narrows the table.
      href:
        kpis.usagesAvailable && kpis.unusedCount > 0
          ? "/sailpoint/transforms?usages=0"
          : undefined,
    },
  ];

  return <StatGroup layout="inline" items={items} />;
}
