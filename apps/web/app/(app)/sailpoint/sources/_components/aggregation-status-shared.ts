import type { SourceAggregationStatus } from "@/lib/sailpoint/sources-api";

/**
 * Best-effort "is an aggregation in flight" inference from the source
 * payload. ISC doesn't expose a dedicated per-source aggregation-status
 * endpoint in v2025 — `getSourceAggregationStatus` returns the same
 * `healthy` / `status` / `since` triple as `GET /v2025/sources/{id}`.
 *
 * Status strings observed in the wild while an aggregation runs:
 *  - `SOURCE_STATE_AGGREGATING`
 *  - `SOURCE_STATE_AGGREGATION_IN_PROGRESS`
 *
 * Both share the `AGGREGAT` substring, so we match case-insensitively on
 * that. Anything else falls through to "not running" — false negatives are
 * preferable to false positives here: ISC itself rejects concurrent
 * aggregation requests at the API layer, so the UI's disabled state is
 * advisory, not authoritative.
 *
 * Shared between the (server-rendered) detail page and the (client)
 * trigger button — kept in a `*-shared.ts` file because `process-button`
 * can't import from a `"use client"` module without losing
 * tree-shaking discipline.
 */
export function isAggregationRunning(
  status: SourceAggregationStatus | null | undefined,
): boolean {
  if (!status || !status.status) return false;
  return /aggregat/i.test(status.status);
}
