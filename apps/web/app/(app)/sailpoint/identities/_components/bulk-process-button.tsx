"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { processIdentitiesAction } from "./identity-actions";

/**
 * Bulk "Process identities" wedge. Disabled when nothing is selected;
 * confirms before firing because the underlying call recomputes attributes
 * and can trigger downstream provisioning across the selection.
 */
export function BulkProcessButton({
  selectedIds,
  onProcessed,
}: {
  selectedIds: string[];
  /**
   * Called after a successful bulk process so the page can clear its
   * row selection. Server-side data is refreshed via `router.refresh()`.
   */
  onProcessed?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{
    taskId?: string;
    count?: number;
  } | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const count = selectedIds.length;
  const disabled = count === 0;

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await processIdentitiesAction(selectedIds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess({ taskId: result.taskId, count: result.count });
      onProcessed?.();
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          aria-disabled={disabled}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Process identities
          {count > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10px] font-medium">
              {count}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Recompute attributes for {count}{" "}
            {count === 1 ? "identity" : "identities"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            Re-runs identity processing on the connected SailPoint tenant
            for the selected identities. Source data isn&apos;t
            re-aggregated, but identity attributes, transforms, and
            lifecycle state are recomputed from current account data. This
            may trigger downstream provisioning.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {success ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium">
                Submitted {success.count}{" "}
                {success.count === 1 ? "identity" : "identities"} to SailPoint.
              </p>
              {success.taskId ? (
                <p className="font-mono text-[11px]">
                  Task id: {success.taskId}
                </p>
              ) : (
                <p className="text-[11px]">
                  No task id returned — check the tenant audit log to
                  confirm the run.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 font-mono text-[11px] text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>{success ? "Close" : "Cancel"}</AlertDialogCancel>
          {!success && (
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                if (!pending) onConfirm();
              }}
            >
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Process {count} {count === 1 ? "identity" : "identities"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
