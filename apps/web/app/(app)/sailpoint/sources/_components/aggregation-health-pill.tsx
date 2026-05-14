import { Pill } from "@/components/ui/pill";

import type { AggregationHealth } from "@/lib/sailpoint/source-health";

/**
 * Row-level aggregation health indicator. Renders nothing when the
 * aggregation is healthy or unknown — the absence of a pill is the
 * "all good" signal. The Pill primitive (see DESIGN.md §2.4) supplies
 * the `warning` / `danger` tones used here.
 */
export function AggregationHealthPill({
  health,
}: {
  health: AggregationHealth;
}) {
  if (health.state === "stale") {
    return (
      <Pill tone="warning" dot>
        Stale
      </Pill>
    );
  }
  if (health.state === "failed") {
    return (
      <Pill tone="danger" dot>
        Failed
      </Pill>
    );
  }
  return null;
}
