import { Pill, type PillTone } from "@/components/ui/pill";

/**
 * Maps SailPoint lifecycle state names to the closed tone palette.
 * Unknown states fall back to neutral so the column reads on tenants
 * that use custom states. See DESIGN.md §2.4 — domain wrapper pattern.
 */
const TONE: Record<string, PillTone> = {
  active: "success",
  inactive: "warning",
  prehire: "info",
  suspended: "warning",
  terminated: "danger",
};

export function LifecyclePill({
  state,
  dot = false,
}: {
  state?: string | null;
  /** Adds a leading tone-matched dot — used to mark the *current* LCS
   *  among a wrap of profile-defined pills (Identity Details). Default
   *  false keeps the table column visually flat. */
  dot?: boolean;
}) {
  if (!state) {
    return (
      <span
        className="si-caption text-muted-foreground/50"
        aria-label="No lifecycle state"
      >
        —
      </span>
    );
  }
  return (
    <Pill tone={TONE[state.toLowerCase()] ?? "neutral"} dot={dot}>
      {state}
    </Pill>
  );
}
