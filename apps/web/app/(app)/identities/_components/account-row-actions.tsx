"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Kebab menu at the end of each account row.
 *
 * Wired actions are deliberately limited to read-only operations for v0.
 * The ISC primitives that *could* live here in the future are documented
 * inline so the next PR has a checklist:
 *
 *  - Enable account        POST /v2025/accounts/{id}/enable
 *  - Disable account       POST /v2025/accounts/{id}/disable
 *  - Unlock account        POST /v2025/accounts/{id}/unlock
 *  - Re-aggregate source   POST /v2025/sources/{sourceId}/load-accounts
 *                          (per-source — re-aggregating a single account is
 *                          not a first-class ISC primitive)
 *
 * Live for now: "View raw attributes" — opens a Dialog with the full
 * attribute payload, which is what admins reach for first when correlating
 * source data with identity attributes.
 */
export function AccountRowActions({
  sourceName,
  accountName,
  attributes,
}: {
  sourceName: string;
  accountName: string;
  attributes: Record<string, unknown>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={`Actions for ${accountName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            View raw attributes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
          <DialogTitle>{sourceName} — raw attributes</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {accountName}
          </DialogDescription>
          <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
            {JSON.stringify(attributes ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
