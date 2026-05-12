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

import { processIdentityAction } from "./identity-actions";

/**
 * "Process identity" wedge button. Wraps the SailPoint
 * `POST /v2025/identities/process` call behind an explicit confirm step —
 * recomputing attributes can rewire downstream provisioning, so the
 * one-click path is intentional.
 *
 * Pattern mirrors `delete-dialog.tsx`: inline success/error states inside
 * the dialog + `router.refresh()` to pull the updated `modified` timestamp.
 * No toaster lib in the repo yet — adding one is its own ADR.
 */
export function ProcessIdentityButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ taskId?: string } | null>(
    null,
  );

  React.useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await processIdentityAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess({ taskId: result.taskId });
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Process identity
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Recompute attributes and lifecycle?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            Re-runs identity processing for{" "}
            <span className="font-mono text-foreground">{name}</span> on
            the connected SailPoint tenant. Source data isn&apos;t
            re-aggregated, but identity attributes, transforms, and
            lifecycle state are recomputed from the current account data.
            This may trigger downstream provisioning.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {success ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium">Submitted to SailPoint.</p>
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
              Process identity
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
