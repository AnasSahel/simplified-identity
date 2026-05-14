"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { refreshIdentityAttributeDrift } from "@/lib/identity-attributes/drift-actions";

/**
 * Relative time formatter for the snapshot age — keeps the header
 * legible ("Drift snapshot from 5 min ago") without dragging in a
 * full Intl.RelativeTimeFormat helper.
 *
 * Server-rendered against `capturedAt`, so the value updates on
 * `router.refresh()` after a successful refresh.
 */
function formatRelative(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.max(0, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

type Props = {
  /** Timestamp of the latest snapshot row — `null` when never refreshed. */
  capturedAt: Date | null;
};

/**
 * Drift snapshot header — text + refresh trigger rendered above the
 * filter bar on the Identity Attributes list. Calls the
 * `refreshIdentityAttributeDrift` server action and surfaces an
 * inline status line on completion (the app doesn't ship a toast
 * primitive — keeping the affordance close to the trigger).
 */
export function DriftSnapshotHeader({ capturedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<{
    kind: "success";
    refreshed: number;
    failures: number;
    durationMs: number;
  } | { kind: "error"; message: string } | null>(null);

  const hasSnapshot = capturedAt !== null;
  const buttonLabel = hasSnapshot
    ? "Refresh drift snapshot"
    : "Compute drift snapshot";

  const handleClick = () => {
    setLastResult(null);
    startTransition(async () => {
      const result = await refreshIdentityAttributeDrift();
      if (result.ok) {
        setLastResult({
          kind: "success",
          refreshed: result.refreshed,
          failures: result.failures,
          durationMs: result.durationMs,
        });
        router.refresh();
      } else {
        setLastResult({ kind: "error", message: result.error });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed bg-card/50 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4" aria-hidden />
        <span>
          {hasSnapshot
            ? `Drift snapshot from ${formatRelative(capturedAt!)}`
            : "No drift snapshot yet"}
        </span>
        {lastResult?.kind === "success" ? (
          <span className="si-caption text-emerald-700 dark:text-emerald-300">
            · Refreshed {lastResult.refreshed} attribute
            {lastResult.refreshed === 1 ? "" : "s"} in{" "}
            {Math.round(lastResult.durationMs / 100) / 10}s
            {lastResult.failures > 0
              ? ` · ${lastResult.failures} failed`
              : ""}
          </span>
        ) : null}
        {lastResult?.kind === "error" ? (
          <span className="si-caption text-rose-700 dark:text-rose-300">
            · {lastResult.message}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="gap-1.5"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        )}
        {buttonLabel}
      </Button>
    </div>
  );
}
