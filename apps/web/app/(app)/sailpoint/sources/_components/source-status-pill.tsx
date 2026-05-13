import { Pill, type PillTone } from "@/components/ui/pill";

/**
 * Maps SailPoint source health to the closed tone palette.
 *
 * ISC exposes a boolean `healthy` plus a `status` string (e.g.
 * `SOURCE_STATE_HEALTHY`, `SOURCE_STATE_FAILURE_AUTHENTICATION`). We
 * collapse them into the three buckets the spec calls for:
 *  - Connected — `healthy === true`
 *  - Error — `healthy === false` and status mentions FAILURE
 *  - Disconnected — `healthy === false` otherwise (e.g. never run, paused)
 *  - "—" — unknown (both fields missing)
 *
 * Domain wrapper pattern — see DESIGN.md §2.4.
 */
export function SourceStatusPill({
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
        aria-label="No status"
      >
        —
      </span>
    );
  }

  if (healthy === true) {
    return (
      <Pill tone="success" dot>
        Connected
      </Pill>
    );
  }

  const tone: PillTone =
    status && /FAILURE|ERROR/i.test(status) ? "danger" : "warning";
  const label = tone === "danger" ? "Error" : "Disconnected";

  return (
    <Pill tone={tone} dot>
      {label}
    </Pill>
  );
}
