/**
 * Aggregation health classification for a source list row. Pure, no IO —
 * imported by both the list page and the inline `LastAggregationCell`
 * sub-line so the two cues never drift.
 *
 * Precedence: `failed` > `stale` > `healthy` > `unknown`.
 *
 *  - `failed`  : the most recent aggregation reported a failure. We
 *                consider it failed when `healthy === false` OR when
 *                the `status` string matches an ISC failure marker.
 *                ISC currently emits strings like
 *                `SOURCE_STATE_HEALTHY_FAILURE_AUTHENTICATION` /
 *                `SOURCE_STATE_ERROR_*`. We regex on AUTH / FAILURE /
 *                ERROR rather than matching a closed enum because ISC
 *                doesn't publish one.
 *  - `stale`   : `now - since > thresholdHours` AND the aggregation did
 *                not fail (a failed aggregation that is also stale
 *                stays classified as failed — failed is the louder
 *                signal).
 *  - `healthy` : aggregation was recent and not failed.
 *  - `unknown` : no `since` timestamp on the source. Renders no pill.
 */
export type AggregationHealth =
  | { state: "failed"; reason: "auth" | "other" }
  | { state: "stale"; ageMs: number }
  | { state: "healthy" }
  | { state: "unknown" };

export type AggregationHealthInput = {
  since?: string | null;
  healthy?: boolean;
  status?: string | null;
};

const AUTH_RE = /AUTH/i;
const FAILURE_RE = /FAILURE|ERROR/i;

export function computeAggregationHealth(
  source: AggregationHealthInput,
  thresholdHours: number,
  now: number = Date.now(),
): AggregationHealth {
  const status = source.status ?? "";
  const isAuthFailure = AUTH_RE.test(status);
  const isFailureStatus = FAILURE_RE.test(status);
  const failed = source.healthy === false || isFailureStatus || isAuthFailure;

  if (failed) {
    return { state: "failed", reason: isAuthFailure ? "auth" : "other" };
  }

  if (!source.since) {
    return { state: "unknown" };
  }

  const t = new Date(source.since).getTime();
  if (Number.isNaN(t)) {
    return { state: "unknown" };
  }

  const ageMs = Math.max(0, now - t);
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  if (ageMs > thresholdMs) {
    return { state: "stale", ageMs };
  }

  return { state: "healthy" };
}
