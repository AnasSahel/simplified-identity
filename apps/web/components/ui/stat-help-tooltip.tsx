"use client";

import { HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Small `?` icon rendered inline with a `<StatGroup>` cell label. Opens a
 * shadcn `<Tooltip>` with the explanatory `text` on hover and keyboard
 * focus. Used to surface KPI definitions that aren't self-explanatory
 * (e.g. "Drift", "Unused" on the identity-attributes list).
 *
 * Client component so the trigger can `stopPropagation` on click — the
 * surrounding cell may be wrapped in a `<Link>`, and tapping the help
 * icon should not navigate.
 *
 * Trigger is a focusable `<span role="button" tabIndex={0}>` (NOT a
 * `<button>`): when the parent cell is wrapped in `<Link>`, nesting a
 * real `<button>` inside `<a>` is invalid HTML. A span avoids the
 * nested-interactive issue while still being keyboard-focusable and
 * announceable.
 *
 * Accessibility:
 * - `role="button"` + `tabIndex={0}` keep the trigger in the tab order.
 * - `aria-label` follows the pattern `What is <label>?` so screen
 *   readers announce which KPI the help applies to.
 * - Tooltip opens on hover AND focus (Radix default).
 * - Click is intercepted to prevent navigation when nested in a link.
 */
export function StatHelpTooltip({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`What is ${label}?`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            // Swallow Enter/Space so they don't fire the parent link.
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="inline-flex cursor-help items-center justify-center rounded-sm text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[280px] whitespace-normal text-pretty"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
