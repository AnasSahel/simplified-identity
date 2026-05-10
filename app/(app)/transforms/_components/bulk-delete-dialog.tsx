"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

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

import { deleteTransformAction } from "./editor-actions";
import type { SelectableTransform } from "./types";

/**
 * Bulk-delete confirmation dialog. Filters out internal (built-in)
 * transforms automatically — those can't be deleted via the API.
 *
 * Hard-blocks if any custom transform in the selection has known usages
 * (referenced by an identity profile or another transform). The user
 * has to deselect or fix the references first.
 *
 * Deletes sequentially via `deleteTransformAction` so a partial failure
 * still leaves a coherent state — and we can report which row failed.
 */
export function BulkDeleteDialog({
  selected,
  open,
  onOpenChange,
  onSuccess,
}: {
  selected: ReadonlyArray<SelectableTransform>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after at least one delete succeeded so the caller can clear
   * the table selection. */
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<{ name: string; error: string }[]>([]);

  // Reset errors when re-opened.
  React.useEffect(() => {
    if (open) setErrors([]);
  }, [open]);

  const internal = selected.filter((t) => t.internal);
  const deletable = selected.filter((t) => !t.internal);
  const withUsages = deletable.filter((t) => (t.usages ?? 0) > 0);

  const blocked = withUsages.length > 0 || deletable.length === 0;

  function onConfirm() {
    setErrors([]);
    startTransition(async () => {
      const failures: { name: string; error: string }[] = [];
      // Sequential — deleting in parallel risks SailPoint rate limits and
      // makes per-row error reporting confusing.
      for (const t of deletable) {
        const r = await deleteTransformAction(t.id, t.name);
        if (!r.ok) failures.push({ name: t.name, error: r.error });
      }
      if (failures.length === deletable.length) {
        // Total failure — keep the dialog open with errors.
        setErrors(failures);
        return;
      }
      // Partial or full success — refresh the list and clear the
      // selection. Surface the failures inline if any.
      router.refresh();
      onSuccess();
      if (failures.length > 0) {
        setErrors(failures);
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
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Delete{" "}
            {deletable.length === 1
              ? "1 transform"
              : `${deletable.length} transforms`}
            ?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-xs leading-relaxed">
            <span className="block">
              SailPoint does not validate references on delete. Anything
              pointing at these transforms will start returning empty
              values silently.
            </span>
            {internal.length > 0 && (
              <span className="block rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                {internal.length} built-in transform
                {internal.length === 1 ? "" : "s"} in the selection will
                be skipped — those are managed by SailPoint and can&apos;t
                be deleted.
              </span>
            )}
            {withUsages.length > 0 && (
              <span className="block rounded-md border border-rose-300 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <strong>Blocked:</strong> {withUsages.length} of the
                selected transforms{" "}
                {withUsages.length === 1 ? "is" : "are"} referenced
                elsewhere. Replace or remove the references before
                deleting.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deletable.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-2">
            <ul className="space-y-1 text-xs">
              {deletable.map((t) => {
                const u = t.usages ?? 0;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-mono">{t.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]",
                        u > 0
                          ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
                      )}
                    >
                      {u} use{u === 1 ? "" : "s"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-2 dark:border-rose-900/40 dark:bg-rose-950/30">
            <p className="pb-1 text-[11px] font-medium text-rose-900 dark:text-rose-200">
              {errors.length} delete{errors.length === 1 ? "" : "s"} failed
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
            disabled={pending || blocked}
            onClick={(e) => {
              e.preventDefault();
              if (!blocked && !pending) onConfirm();
            }}
            className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 disabled:bg-rose-300 disabled:text-rose-50"
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Delete{" "}
            {deletable.length === 0
              ? ""
              : deletable.length === 1
                ? "1 transform"
                : `${deletable.length} transforms`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
