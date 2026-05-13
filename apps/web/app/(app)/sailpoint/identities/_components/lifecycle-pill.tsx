import { Pill, type PillTone } from "@/components/ui/pill";

/**
 * Maps SailPoint lifecycle state names to the closed tone palette.
 * Unknown states fall back to neutral so the column reads on tenants
 * that use custom states. See DESIGN.md §2 (Semantic tones) and §10
 * (lifecycle state mapping prompt) — canonical mapping table.
 *
 * Tone semantics:
 * - `success` — healthy steady state (active).
 * - `info`    — informational / awaiting future event (prehire).
 * - `warning` — needs admin attention. Anything `pending*` lands here
 *               by default since "pending" in ISC implies a state the
 *               operator should resolve. Also: inactive, suspended.
 * - `danger`  — terminal or locked-out (terminated).
 * - `neutral` — archived / unknown state on custom tenants.
 *
 * Keys are lowercased before lookup, so callers can pass either
 * `pendingCorrection` or `pendingcorrection` and get the same tone.
 */
const TONE: Record<string, PillTone> = {
  active: "success",
  archived: "neutral",
  inactive: "warning",
  pendingapproval: "warning",
  pendingcorrection: "warning",
  pendingdelete: "warning",
  pendinghire: "warning",
  pendingreview: "warning",
  prehire: "info",
  suspended: "warning",
  terminated: "danger",
};

export function LifecyclePill({ state }: { state?: string | null }) {
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
  return <Pill tone={TONE[state.toLowerCase()] ?? "neutral"}>{state}</Pill>;
}
