"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Disabled action button + tooltip — used in the Overview Danger zone card
 * (issue #185) for `Pause source`, `Reset correlation`, `Delete source`.
 *
 * Real handlers land with issue #182. Until then we render an
 * `aria-disabled` button (NOT native `disabled`, which swallows pointer
 * events and breaks the tooltip) and rely on the tooltip to explain why
 * it's not interactive.
 */
export function OverviewActionStub({
  label,
  tooltip,
  variant = "outline",
}: {
  label: string;
  tooltip: string;
  variant?: "outline" | "destructive";
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-disabled="true"
            className={cn(
              "inline-flex h-8 w-full items-center justify-start gap-2 rounded-md border px-3 text-xs font-medium",
              "cursor-not-allowed opacity-60",
              variant === "destructive"
                ? "border-destructive/40 text-destructive"
                : "border-input text-foreground bg-card",
            )}
            onClick={(e) => e.preventDefault()}
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
