import { cn } from "@/lib/utils";

// Map SailPoint transform types to a Tailwind tone family.
// Default falls back to neutral for unknown types.
const TYPE_TONES: Record<string, string> = {
  // string ops
  upper: "amber",
  lower: "amber",
  trim: "amber",
  // string composition
  concat: "violet",
  split: "green",
  substring: "violet",
  replace: "orange",
  replaceAll: "orange",
  // identity / lookup
  accountAttribute: "indigo",
  identityAttribute: "indigo",
  reference: "indigo",
  lookup: "blue",
  static: "zinc",
  firstValid: "emerald",
  // normalization
  normalizeNames: "rose",
  decomposeDiacriticalMarks: "cyan",
  // formats
  e164phone: "blue",
  iso3166: "teal",
  rfc5646: "pink",
  displayName: "fuchsia",
  // date / number
  dateCompare: "sky",
  dateFormat: "sky",
  dateMath: "sky",
  conditional: "purple",
  // generic
  base64Encode: "stone",
  base64Decode: "stone",
};

const TONE_CLASSES: Record<string, { dot: string; pill: string }> = {
  zinc: { dot: "bg-zinc-500", pill: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" },
  amber: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" },
  blue: { dot: "bg-blue-500", pill: "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100" },
  indigo: { dot: "bg-indigo-500", pill: "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100" },
  emerald: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" },
  rose: { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100" },
  violet: { dot: "bg-violet-500", pill: "bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100" },
  green: { dot: "bg-green-500", pill: "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100" },
  orange: { dot: "bg-orange-500", pill: "bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100" },
  cyan: { dot: "bg-cyan-500", pill: "bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100" },
  teal: { dot: "bg-teal-500", pill: "bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100" },
  pink: { dot: "bg-pink-500", pill: "bg-pink-50 text-pink-900 dark:bg-pink-950/40 dark:text-pink-100" },
  fuchsia: { dot: "bg-fuchsia-500", pill: "bg-fuchsia-50 text-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-100" },
  sky: { dot: "bg-sky-500", pill: "bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100" },
  purple: { dot: "bg-purple-500", pill: "bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-100" },
  stone: { dot: "bg-stone-500", pill: "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200" },
};

export function TypePill({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const tone = TYPE_TONES[type] ?? "zinc";
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px]",
        t.pill,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden />
      {type}
    </span>
  );
}
