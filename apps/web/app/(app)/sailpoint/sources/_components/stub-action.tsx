"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Disabled stub button for actions whose handler isn't wired yet (Test
 * connection → #182, Edit → forthcoming). Wraps in a tooltip so the
 * "Coming in v2" reason is discoverable on hover.
 *
 * Lives in its own client-component file because Radix Tooltip primitives
 * use a Slot pattern (`asChild` + `cloneElement`) that resolves
 * differently between SSR and client renders when the parent is a server
 * component. Rendering the whole StubAction subtree in a client boundary
 * keeps server and client outputs aligned (matches the sibling
 * `OverviewActionStub` pattern).
 *
 * `aria-disabled` (not `disabled`) keeps the button hoverable so the
 * tooltip can fire; `type="button"` makes it inert without an onClick.
 */
export function StubAction({
  children,
  reason = "Coming in v2",
}: {
  children: React.ReactNode;
  reason?: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-disabled="true"
            tabIndex={0}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-card px-3 text-xs font-medium shadow-sm",
              "cursor-not-allowed opacity-60",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
            onClick={(e) => e.preventDefault()}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
