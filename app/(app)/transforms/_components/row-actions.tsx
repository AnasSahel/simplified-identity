"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, CopyPlus, Eye, MoreHorizontal, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DeleteTransformDialog } from "./delete-dialog";
import { DuplicateTransformDialog } from "./duplicate-dialog";

export function RowActions({
  id,
  name,
  usages,
  internal,
  tenantTransformNames,
}: {
  id: string;
  name: string;
  usages?: number;
  internal?: boolean;
  /** All names currently in the tenant — passed down so the Duplicate
   * dialog can pre-compute a unique default without a round-trip. */
  tenantTransformNames: ReadonlyArray<string>;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [duplicateOpen, setDuplicateOpen] = React.useState(false);

  function copyName() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(name);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${name}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link
              href={`/transforms/${encodeURIComponent(id)}`}
              className="gap-2"
            >
              <Eye className="h-3.5 w-3.5" />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyName} className="gap-2">
            <Copy className="h-3.5 w-3.5" />
            Copy name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              // Keep the dropdown's auto-close, but defer opening the
              // dialog by a tick so Radix doesn't fight the focus
              // trap when the dropdown unmounts.
              e.preventDefault();
              setTimeout(() => setDuplicateOpen(true), 0);
            }}
            className="gap-2"
          >
            <CopyPlus className="h-3.5 w-3.5" />
            Duplicate…
          </DropdownMenuItem>
          {!internal && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setDeleteOpen(true), 0);
                }}
                className="gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DuplicateTransformDialog
        transform={{ id, name }}
        tenantTransformNames={tenantTransformNames}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />

      {!internal && (
        <DeleteTransformDialog
          id={id}
          name={name}
          usages={usages}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  );
}
