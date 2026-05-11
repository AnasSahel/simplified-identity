"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { findAvailableCopyName } from "./copy-name";
import { duplicateTransformAction } from "./editor-actions";

/**
 * Row-level Duplicate dialog with editable name.
 *
 * The input is pre-filled with the client-computed default name
 * (`<original> (copy)` or `(copy N)`) so the one-click flow stays a single
 * Enter away. The user can override the name for the two main cases:
 *   1. Forking a built-in to start a custom variant under a clean name
 *      (ISC `name` is immutable post-create — pre-create is the only window).
 *   2. Avoiding `(copy)` noise on long lists with hundreds of transforms.
 *
 * Server-side re-checks uniqueness against the live tenant list — the
 * client-side default is just a UX hint that can become stale if another
 * user creates a transform with the same name between dialog open and submit.
 *
 * Bulk Duplicate goes through a separate action and stays untouched.
 */
export function DuplicateTransformDialog({
  transform,
  tenantTransformNames,
  open,
  onOpenChange,
}: {
  transform: { id: string; name: string };
  /** All names currently present in the tenant — used once to compute the
   * default `(copy)` candidate so opening the dialog doesn't round-trip. */
  tenantTransformNames: ReadonlyArray<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // Compute the default each time the dialog opens — `tenantTransformNames`
  // can change between opens (e.g. after a previous duplicate succeeded).
  React.useEffect(() => {
    if (!open) return;
    const taken = new Set(tenantTransformNames);
    const fallback = `${transform.name} (copy)`;
    const candidate = findAvailableCopyName(transform.name, taken) ?? fallback;
    setName(candidate);
    setError(null);
  }, [open, transform.name, tenantTransformNames]);

  const trimmed = name.trim();
  const canSubmit = !pending && trimmed !== "";

  function onSubmit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await duplicateTransformAction(transform.id, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CopyPlus className="h-4 w-4 text-foreground" />
            Duplicate{" "}
            <span className="font-mono text-sm font-medium">
              {transform.name}
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            Creates a copy of this transform. Choose any unique name —
            SailPoint forbids renaming a transform after create, so this is
            the only chance to set it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1">
          <label
            htmlFor="duplicate-name"
            className="text-[11px] font-medium text-muted-foreground"
          >
            New name
          </label>
          <input
            id="duplicate-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
            autoFocus
            className={cn(
              "h-9 w-full rounded-md border bg-background px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-1",
              trimmed === ""
                ? "border-rose-300 focus-visible:ring-rose-500"
                : "border-input focus-visible:ring-ring",
            )}
            spellCheck={false}
          />
        </div>

        {error && (
          <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 font-mono text-[11px] text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Duplicate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
