"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, CopyPlus, Eye, Loader2, MoreHorizontal, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DeleteTransformDialog } from "./delete-dialog";
import { duplicateTransformAction } from "./editor-actions";

export function RowActions({
  id,
  name,
  usages,
  internal,
}: {
  id: string;
  name: string;
  usages?: number;
  internal?: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [duplicating, startDuplicate] = React.useTransition();
  const [duplicateError, setDuplicateError] = React.useState<string | null>(
    null,
  );

  function copyName() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(name);
    }
  }

  function handleDuplicate(e: Event) {
    // Keep the dropdown's auto-close, but defer the work so Radix unmounts
    // cleanly before we hand off to the transition.
    e.preventDefault();
    setDuplicateError(null);
    startDuplicate(async () => {
      const result = await duplicateTransformAction(id);
      if (!result.ok) {
        setDuplicateError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${name}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
        >
          {duplicating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
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
            onSelect={handleDuplicate}
            disabled={duplicating}
            className="gap-2"
          >
            <CopyPlus className="h-3.5 w-3.5" />
            Duplicate
          </DropdownMenuItem>
          {!internal && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  // Keep the dropdown's auto-close, but defer opening the
                  // dialog by a tick so Radix doesn't fight the focus
                  // trap when the dropdown unmounts.
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

      {duplicateError && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 shadow-lg dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <p className="font-medium">Duplicate failed</p>
          <p className="mt-0.5 font-mono text-[11px] opacity-90">
            {duplicateError}
          </p>
          <button
            type="button"
            onClick={() => setDuplicateError(null)}
            className="absolute right-1.5 top-1.5 text-rose-900/60 hover:text-rose-900 dark:text-rose-200/60 dark:hover:text-rose-200"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

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
