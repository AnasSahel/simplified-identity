import { cn } from "@/lib/utils";

/**
 * Deterministic initials avatar. Renders 1-2 uppercase characters on a
 * colour-band picked from a hash of the display name.
 *
 * No image fetch (no Gravatar, no PII leak), no layout shift. The band
 * lives in a fixed palette of 6 muted colours that read on both light and
 * dark backgrounds — picked from the existing pill palette so the page
 * stays visually coherent.
 */
const PALETTE = [
  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
] as const;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AvatarInitials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const palette = PALETTE[hashCode(name) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-tight",
        palette,
        className,
      )}
    >
      {initialsFor(name)}
    </span>
  );
}
