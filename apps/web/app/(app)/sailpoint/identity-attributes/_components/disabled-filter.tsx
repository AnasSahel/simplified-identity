"use client";

import { ChevronDown, Filter } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Filter trigger rendered in a permanently-disabled state, with a tooltip
 * explaining what's gating it. Used for "Unused" and "Drift" filters that
 * ship in the v1 surface ahead of their backing detection data (#206 / #207).
 *
 * Intentionally not a `<FilterDropdown>` variant: the disabled chip is
 * conceptually different — no menu, no URL contract, just a visible-but-
 * inert affordance. Keeping it separate avoids muddying the dropdown API.
 *
 * Tooltip wraps a `<span>` (not the disabled button directly) so Radix
 * receives a focusable pointer-events target. Inside the app layout the
 * sidebar already provides a `<TooltipProvider>`.
 */
export function DisabledFilter({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          <button
            type="button"
            disabled
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 cursor-not-allowed opacity-50",
            )}
            aria-disabled
          >
            <Filter className="h-3.5 w-3.5" />
            {label}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
