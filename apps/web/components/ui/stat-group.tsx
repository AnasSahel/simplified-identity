import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * `<StatGroup>` — KPI cards (grid layout) or detail-header stats
 * (inline layout). See DESIGN.md §2.8.
 *
 * `grid` is used at page-level above filters / table.
 * `inline` is used in detail pages next to the header.
 *
 * Tones (`grid` only): `warning` (amber) / `danger` (rose) re-tint the
 * card border and background slightly. Inline layout doesn't accept
 * tones — semantics carried by the value, not the background.
 */

export type StatItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  /** Grid-only. Ignored in `inline`. */
  tone?: "default" | "warning" | "danger";
  /** Leading icon rendered at the top-right of the cell. */
  icon?: React.ReactNode;
};

export function StatGroup({
  layout,
  items,
  className,
}: {
  layout: "grid" | "inline";
  items: StatItem[];
  className?: string;
}) {
  if (layout === "inline") {
    return (
      <div
        className={cn(
          "flex divide-x rounded-lg border bg-card",
          className,
        )}
      >
        {items.map((item, idx) => (
          <StatCell key={idx} item={item} layout="inline" />
        ))}
      </div>
    );
  }
  // grid
  const cols = items.length;
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        cols >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item, idx) => (
        <StatCell key={idx} item={item} layout="grid" />
      ))}
    </div>
  );
}

function StatCell({
  item,
  layout,
}: {
  item: StatItem;
  layout: "grid" | "inline";
}) {
  const tone = layout === "grid" ? (item.tone ?? "default") : "default";

  const body = (
    <div
      className={cn(
        layout === "grid"
          ? "flex h-full flex-col gap-1 rounded-lg border bg-card p-4 transition-colors"
          : "flex flex-1 flex-col gap-1 px-5 py-4",
        layout === "grid" &&
          tone === "warning" &&
          "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
        layout === "grid" &&
          tone === "danger" &&
          "border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
        layout === "grid" &&
          item.href &&
          "hover:border-foreground/30",
        layout === "inline" &&
          item.href &&
          "hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="si-caption uppercase tracking-wider text-muted-foreground">
          {item.label}
        </span>
        {item.icon ? (
          <span
            aria-hidden
            className={cn(
              "text-muted-foreground/60",
              tone === "warning" && "text-amber-600 dark:text-amber-400",
              tone === "danger" && "text-rose-600 dark:text-rose-400",
            )}
          >
            {item.icon}
          </span>
        ) : null}
      </div>
      <div className="text-3xl font-semibold leading-tight tracking-tight tabular-nums">
        {item.value}
      </div>
      {item.sub ? (
        <div className="si-caption text-muted-foreground">{item.sub}</div>
      ) : (
        <div className="h-4" aria-hidden />
      )}
    </div>
  );

  if (!item.href) return body;
  return (
    <Link
      href={item.href}
      className={cn(
        "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        layout === "grid" && "rounded-lg",
        // Inline cells share the row via `flex-1` on their inner body.
        // The Link wrapper must carry the same growth so a cliquable cell
        // doesn't collapse to its content width while non-link siblings
        // absorb the slack.
        layout === "inline" && "flex flex-1",
      )}
    >
      {body}
    </Link>
  );
}
