"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * `<IssuesBadge>` — small dot rendered inline next to a transform name
 * when the lint scan flagged at least one issue against that transform
 * (#310 PR 4/4).
 *
 * Visual rules (cf. ADR §Recommandation détaillée):
 *   - 0 errors + 0 warnings → render nothing (caller can also skip render).
 *   - errors > 0            → red rose-500 dot (errors win over warnings).
 *   - errors === 0 && warnings > 0 → amber dot.
 *
 * Tooltip: `<n> error(s) · <n> warning(s)` (singular when 1).
 *
 * Click handling: NONE on the badge itself — the parent row already
 * owns the click → drawer behavior, and the badge sits inside the row's
 * click target (no `e.stopPropagation`). The tooltip trigger is a plain
 * `<span>` (not a Link) so it doesn't compete with the row navigation.
 *
 * The sidebar layout already provides a `<TooltipProvider>`, so callers
 * don't need to wrap us — same convention as `<UsagesCell>`.
 */

export type IssuesBadgeCounts = {
  errors: number;
  warnings: number;
};

export function IssuesBadge({
  counts,
  className,
}: {
  counts: IssuesBadgeCounts | undefined;
  className?: string;
}) {
  if (!counts || (counts.errors === 0 && counts.warnings === 0)) return null;

  const isError = counts.errors > 0;
  // Error wins over warnings — see ADR. The dot tone follows.
  const dotClass = isError
    ? "bg-rose-500"
    : "bg-amber-500";

  const errorWord = counts.errors === 1 ? "error" : "errors";
  const warningWord = counts.warnings === 1 ? "warning" : "warnings";
  const tooltipText = `${counts.errors} ${errorWord} · ${counts.warnings} ${warningWord}`;

  // Aria-label mirrors the tooltip text so screen readers see the same
  // information as sighted users hovering the dot.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={tooltipText}
          className={cn(
            "inline-flex h-2 w-2 shrink-0 rounded-full",
            dotClass,
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Reduce a `byTransformId` map of issues into a per-transform counts map
 * keyed by transform id. Lives next to the badge so the page (server
 * component) can build the lighter map once and thread it down without
 * passing the full issue list to every row.
 *
 * Accepts both the engine's native `ReadonlyMap<string, ReadonlyArray<Issue>>`
 * and a plain record, so callers that have either shape can use it.
 */
export function summariseIssuesByTransformId(
  byTransformId:
    | ReadonlyMap<string, ReadonlyArray<{ severity: "error" | "warning" }>>
    | Record<string, ReadonlyArray<{ severity: "error" | "warning" }>>
    | undefined,
): Map<string, IssuesBadgeCounts> {
  const out = new Map<string, IssuesBadgeCounts>();
  if (!byTransformId) return out;

  const entries: Iterable<
    [string, ReadonlyArray<{ severity: "error" | "warning" }>]
  > =
    byTransformId instanceof Map
      ? byTransformId.entries()
      : Object.entries(byTransformId);

  for (const [id, issues] of entries) {
    let errors = 0;
    let warnings = 0;
    for (const issue of issues) {
      if (issue.severity === "error") errors += 1;
      else warnings += 1;
    }
    if (errors > 0 || warnings > 0) {
      out.set(id, { errors, warnings });
    }
  }
  return out;
}
