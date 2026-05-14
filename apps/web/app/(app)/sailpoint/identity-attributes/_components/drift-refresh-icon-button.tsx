"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { refreshIdentityAttributeDrift } from "@/lib/identity-attributes/drift-actions";

type Props = {
  /** Timestamp of the latest snapshot row — `null` when never refreshed. */
  hasSnapshot: boolean;
};

/**
 * Icon-only refresh trigger rendered as the `headerAction` of the Drift
 * KPI card (issue #240). Calls `refreshIdentityAttributeDrift` and lets
 * the action's `revalidatePath` re-render the page with the new
 * snapshot — no need to call `router.refresh()` ourselves.
 *
 * Failure mode: a small inline error pill renders just below the button
 * on a wrapping line. We can't use the parent card's sub-line for
 * errors because the parent renders server-side and doesn't know about
 * client state — and the page intentionally doesn't ship a toast
 * primitive (matches the prior `<DriftSnapshotHeader>` choice).
 *
 * The button is wrapped in a span with `stopPropagation` because the
 * KPI cell may be a `<Link>` once the drift snapshot has rows
 * (`?scope=drift`). Without the guard, clicking the refresh icon would
 * also navigate to the drift-filtered view.
 */
export function DriftRefreshIconButton({ hasSnapshot }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label = hasSnapshot
    ? "Refresh drift snapshot"
    : "Compute drift snapshot";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await refreshIdentityAttributeDrift();
      if (result.ok) {
        // Belt-and-braces with the action's own `revalidatePath`: forces a
        // re-render even in the rare case where the cache key hasn't
        // invalidated yet (observed once on a slow tenant during smoke).
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <span
      className="inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isPending}
            aria-label={label}
            className="h-7 w-7"
          >
            <RefreshCw
              className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              aria-hidden
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
      {error ? (
        <span
          role="alert"
          className="si-caption ml-2 text-rose-700 dark:text-rose-300"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
