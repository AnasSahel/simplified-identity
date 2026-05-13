import { Pill, type PillTone } from "@/components/ui/pill";

/**
 * Semantic health indicator for the Health column. Distinct from
 * `<SourceStatusPill>` (which shows "Connected / Disconnected / Error" —
 * the connection state). Health is broader: a connected source can be
 * "Warning" if it has unresolved orphans or partial aggregations.
 *
 * For v0 we map purely from `healthy` + `status`:
 *   - healthy === true  → success "Healthy"
 *   - healthy === false
 *       · status contains AUTH    → danger  "Error · auth failed"
 *       · status contains FAILURE → danger  "Error"
 *       · otherwise               → warning "Warning"
 *   - undefined → neutral "—"
 *
 * Future iterations can wire `subtle` to a parsed reason ("2 unresolved",
 * "Partial · N deltas") once we surface those on the source payload.
 */
export function HealthPill({
  healthy,
  status,
}: {
  healthy?: boolean;
  status?: string | null;
}) {
  if (healthy === undefined && !status) {
    return (
      <span
        className="si-caption text-muted-foreground/50"
        aria-label="No health data"
      >
        —
      </span>
    );
  }

  if (healthy === true) {
    return (
      <Pill tone="success" dot>
        Healthy
      </Pill>
    );
  }

  const isAuth = status && /AUTH/i.test(status);
  const isFailure = status && /FAILURE|ERROR/i.test(status);

  const tone: PillTone = isAuth || isFailure ? "danger" : "warning";
  const label = isAuth
    ? "Error · auth failed"
    : isFailure
      ? "Error"
      : "Warning";

  return (
    <Pill tone={tone} dot>
      {label}
    </Pill>
  );
}
