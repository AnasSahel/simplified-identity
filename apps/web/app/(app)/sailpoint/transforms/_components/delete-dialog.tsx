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

/**
 * Destructive action — deleting a transform that's referenced by an
 * identity profile or another transform breaks the downstream silently
 * (SailPoint doesn't validate references on DELETE).
 *
 * UX gates:
 *   1. Show the usage count up-front. If > 0, hard-block — the user
 *      must replace usages first.
 *   2. Require the user to retype the transform's full name. Cheap
 *      friction that catches "wrong row" mistakes.
 *   3. Loading state while the server action runs; success → router
 *      refresh on the list; failure → inline error.
 */
export function DeleteTransformDialog({
  id,
  name,
  usages,
  open,
  onOpenChange,
}: {
  id: string;
  name: string;
  /** Number of references found by the usage walker. `undefined` means
   * we couldn't compute usages (e.g. identity-profiles endpoint failed)
   * — we treat that as "unknown, allow" with a warning. */
  usages: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // Reset on open/close.
  React.useEffect(() => {
    if (open) {
      setConfirm("");
      setError(null);
    }
  }, [open]);

  const blocked = usages !== undefined && usages > 0;
  const matched = confirm.trim() === name;
  const canDelete = !pending && !blocked && matched;

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTransformAction(id, name);
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
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Delete{" "}
            <span className="font-mono text-sm font-medium">{name}</span>?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-xs leading-relaxed">
            <span className="block">
              This permanently removes the transform from the connected
              SailPoint tenant. SailPoint does not validate references on
              delete — anything pointing at this transform will start
              returning empty values.
            </span>
            {usages === undefined ? (
              <span className="block rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Usage count couldn&apos;t be computed — you&apos;re going
                in blind. Make sure no identity profile or other
                transform references{" "}
                <span className="font-mono">{name}</span>.
              </span>
            ) : usages > 0 ? (
              <span className="block rounded-md border border-rose-300 bg-rose-50 px-2 py-1.5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <strong>Blocked:</strong> {usages} reference
                {usages === 1 ? "" : "s"} found. Replace or remove
                {usages === 1 ? " it" : " them"} first.
              </span>
            ) : (
              <span className="block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                No usages detected. Safe to delete.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!blocked && (
          <div className="space-y-1">
            <label
              htmlFor="delete-confirm"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Type{" "}
              <span className="font-mono text-foreground">{name}</span> to
              confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirm}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setConfirm(v);
              }}
              autoFocus
              className={cn(
                "h-9 w-full rounded-md border bg-card px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-1",
                matched
                  ? "border-input focus-visible:ring-ring"
                  : "border-rose-300 focus-visible:ring-rose-500",
              )}
              spellCheck={false}
            />
          </div>
        )}

        {error && (
          <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 font-mono text-[11px] text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={(e) => {
              e.preventDefault();
              if (canDelete) onConfirm();
            }}
            className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 disabled:bg-rose-300 disabled:text-rose-50"
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Delete transform
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
