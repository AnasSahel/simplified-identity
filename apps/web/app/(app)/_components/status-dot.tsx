import { cn } from "@/lib/utils";

type Tone = "neutral" | "emerald" | "amber" | "blue" | "rose";

const TONE: Record<Tone, { dot: string; pill: string; text: string }> = {
  neutral: {
    dot: "bg-zinc-500",
    pill: "bg-muted",
    text: "text-foreground",
  },
  emerald: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-900 dark:text-emerald-100",
  },
  amber: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-900 dark:text-amber-100",
  },
  blue: {
    dot: "bg-blue-500",
    pill: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-900 dark:text-blue-100",
  },
  rose: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-900 dark:text-rose-100",
  },
};

export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        t.pill,
        t.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden />
      {children}
    </span>
  );
}
