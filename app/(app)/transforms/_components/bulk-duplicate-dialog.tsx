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

import { duplicateTransformsAction } from "./editor-actions";
import type { SelectableTransform } from "./types";

/**
 * Bulk-duplicate confirmation dialog.
 *
 * Unlike bulk Delete, we don't filter out built-in transforms — duplicating
 * a built-in to fork it is a legitimate use case (the copy is a custom
 * transform regardless). The server action computes a unique `(copy N)`
 * suffix for each item against the live tenant list.
 *
 * Runs sequentially through the server action (mirrors bulk Delete). A
 * partial failure is surfaced inline; on full failure the dialog stays
 * open so the user can see the errors.
 */
export function BulkDuplicateDialog({
  selected,
  open,
  onOpenChange,
  onSuccess,
}: {
  selected: ReadonlyArray<SelectableTransform>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after at least one duplicate succeeded so the caller can clear
   * the table selection. */
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<
    { name: string; error: string }[]
  >([]);
  const [fatal, setFatal] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrors([]);
      setFatal(null);
    }
  }, [open]);

  function onConfirm() {
    setErrors([]);
    setFatal(null);
    const ids = selected.map((t) => t.id);
    startTransition(async () => {
      const result = await duplicateTransformsAction(ids);
      if (!result.ok) {
        setFatal(result.error);
        return;
      }
      if (result.failures.length === selected.length) {
        // Total failure — keep the dialog open with errors.
        setErrors(
          result.failures.map((f) => ({ name: f.originalName, error: f.error })),
        );
        return;
      }
      // Partial or full success — refresh the list and clear the selection.
      router.refresh();
      onSuccess();
      if (result.failures.length > 0) {
        setErrors(
          result.failures.map((f) => ({
            name: f.originalName,
            error: f.error,
          })),
        );
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CopyPlus className="h-4 w-4 text-foreground" />
            Duplicate{" "}
            {selected.length === 1
              ? "1 transform"
              : `${selected.length} transforms`}
            ?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-xs leading-relaxed">
            <span className="block">
              Creates a copy of each selected transform with a{" "}
              <span className="font-mono">(copy)</span> suffix. If a name
              already exists in the tenant, the suffix is incremented
              automatically (<span className="font-mono">(copy 2)</span>,{" "}
              <span className="font-mono">(copy 3)</span>, …).
            </span>
            <span className="block text-muted-foreground">
              Built-in transforms can be duplicated — the copy is a custom
              transform you can edit freely.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {selected.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-2">
            <ul className="space-y-1 text-xs">
              {selected.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate font-mono">{t.name}</span>
                  {t.internal && (
                    <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                      built-in
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fatal && (
          <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 font-mono text-[11px] text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {fatal}
          </p>
        )}

        {errors.length > 0 && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-2 dark:border-rose-900/40 dark:bg-rose-950/30">
            <p className="pb-1 text-[11px] font-medium text-rose-900 dark:text-rose-200">
              {errors.length} duplicate{errors.length === 1 ? "" : "s"} failed
            </p>
            <ul className="space-y-0.5 font-mono text-[10px] text-rose-900 dark:text-rose-200">
              {errors.map((e) => (
                <li key={e.name}>
                  <span className="font-medium">{e.name}</span>: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || selected.length === 0}
            onClick={(e) => {
              e.preventDefault();
              if (!pending && selected.length > 0) onConfirm();
            }}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Duplicate{" "}
            {selected.length === 0
              ? ""
              : selected.length === 1
                ? "1 transform"
                : `${selected.length} transforms`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
