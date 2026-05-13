import { cn } from "@/lib/utils";

/**
 * Colored 2-letter avatar for a source. The 2-letter code is derived
 * from the source name's words (first letter of the first two), or from
 * the connector identifier when the name doesn't yield two letters.
 *
 * Color is picked deterministically from a closed 7-tone palette via a
 * stable hash of `(connector ?? name)` so the same source always shows
 * the same color across sessions. Connector-coloring (rather than
 * name-coloring) groups all "Active Directory — Paris/Lyon/EU" together
 * visually.
 */
const PALETTE = [
  // [bg, text, border]
  ["bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800/60"],
  ["bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800/60"],
  ["bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-800/60"],
  ["bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800/60"],
  ["bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800/60"],
  ["bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800/60"],
  ["bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800/60"],
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string, fallback: string | null): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9\s—-]/g, " ")
    .split(/[\s—-]+/)
    .filter(Boolean);
  if (cleaned.length >= 2) {
    return (cleaned[0][0] + cleaned[1][0]).toUpperCase();
  }
  if (cleaned.length === 1 && cleaned[0].length >= 2) {
    return cleaned[0].slice(0, 2).toUpperCase();
  }
  if (fallback && fallback.length >= 2) return fallback.slice(0, 2).toUpperCase();
  return (cleaned[0] ?? "?").slice(0, 2).toUpperCase();
}

export function SourceAvatar({
  name,
  connector,
  size = "md",
  className,
}: {
  name: string;
  connector?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const seed = connector ?? name;
  const tone = PALETTE[hashString(seed) % PALETTE.length][0];
  const code = initials(name, connector ?? null);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border font-mono font-semibold uppercase tracking-wider",
        size === "sm" ? "h-7 w-7 si-micro" : "h-9 w-9 text-xs",
        tone,
        className,
      )}
    >
      {code}
    </span>
  );
}
