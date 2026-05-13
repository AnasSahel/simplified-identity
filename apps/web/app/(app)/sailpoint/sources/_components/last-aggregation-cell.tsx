import { cn } from "@/lib/utils";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Pinned to `en-US` so the hover title renders identically on the
 * server (SSR) and on the client (after hydration). `.toLocaleString()`
 * with the default locale produces different output on each — flagged
 * by Next as a hydration mismatch. Matches `<TimestampCell>`.
 */
const DATETIME_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Two-line aggregation cell:
 *   line 1 — relative time ("11 min ago")
 *   line 2 — colored status sub-line: Succeeded / Stale · Xd ago / Failed
 *
 * Status is derived from `healthy` + `since` rather than from a richer
 * aggregation-task object because the v2025 source payload doesn't
 * surface duration or delta counts. The mockup variants ("Partial · 312
 * deltas", "Succeeded · 1m 42s") would need an events-index lookup —
 * out of scope for this iteration.
 */
export function LastAggregationCell({
  since,
  healthy,
}: {
  since: string | null;
  healthy?: boolean;
}) {
  if (!since) {
    return (
      <div className="flex flex-col leading-tight">
        <span className="si-body text-muted-foreground/60">Never</span>
        <span className="si-caption text-muted-foreground/50">—</span>
      </div>
    );
  }

  const t = new Date(since).getTime();
  if (Number.isNaN(t)) {
    return (
      <span className="si-caption text-muted-foreground/50">—</span>
    );
  }

  const ageMs = ageMillis(t);
  const stale = ageMs > STALE_THRESHOLD_MS;

  // Status precedence: Failed (red) > Stale (amber) > Succeeded (green).
  // Stale + healthy=false → still Failed.
  let label: string;
  let tone: "success" | "warning" | "danger";
  if (healthy === false) {
    label = `Failed · ${formatRelative(ageMs)}`;
    tone = "danger";
  } else if (stale) {
    label = `Stale · ${formatRelative(ageMs)}`;
    tone = "warning";
  } else {
    label = "Succeeded";
    tone = "success";
  }

  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  const dotClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="flex flex-col leading-tight">
      <span className="si-body" title={DATETIME_FMT.format(new Date(t))}>
        {formatRelative(ageMs)}
      </span>
      <span className={cn("inline-flex items-center gap-1.5 si-caption", toneClass)}>
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
        {label}
      </span>
    </div>
  );
}

function ageMillis(t: number): number {
  return Math.max(0, Date.now() - t);
}

function formatRelative(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}
