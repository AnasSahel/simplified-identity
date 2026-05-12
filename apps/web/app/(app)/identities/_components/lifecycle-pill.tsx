import { cn } from "@/lib/utils";

/**
 * Lifecycle state pill. SailPoint lifecycle states are tenant-defined, but
 * a handful of state names are conventional ("active", "inactive",
 * "terminated", "prehire", "suspended"). We colour those by intent and fall
 * back to a neutral pill for anything custom — so the column reads even on
 * an unfamiliar tenant.
 */
const PALETTE: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
  inactive:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  prehire:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60",
  suspended:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60",
  terminated:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
};

function classFor(state: string): string {
  return (
    PALETTE[state.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

export function LifecyclePill({ state }: { state?: string | null }) {
  if (!state) {
    return (
      <span className="text-xs text-muted-foreground/50" aria-label="No lifecycle state">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        classFor(state),
      )}
    >
      {state}
    </span>
  );
}
