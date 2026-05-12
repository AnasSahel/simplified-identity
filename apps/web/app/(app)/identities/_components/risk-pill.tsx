import { cn } from "@/lib/utils";

/**
 * Risk score pill. ISC's `identityRiskScore` field exposes a bucket string
 * when the tenant has Cloud Access Management / Identity Risk Score
 * enabled. We render 4 buckets with intent-coloured pills; anything else
 * (or a numeric score we don't know how to bucket) renders as the raw
 * string in a neutral pill.
 *
 * Null is rendered as `—` so the column never collapses height-wise.
 */
const PALETTE: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
  medium:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  high: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
  critical:
    "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-900",
};

function classFor(value: string): string {
  return (
    PALETTE[value.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

export const RISK_OPTIONS: { value: string; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function RiskPill({ value }: { value?: string | null }) {
  if (!value) {
    return (
      <span
        className="text-xs text-muted-foreground/50"
        aria-label="No risk score"
      >
        —
      </span>
    );
  }
  const label =
    RISK_OPTIONS.find((o) => o.value === value.toLowerCase())?.label ?? value;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        classFor(value),
      )}
    >
      {label}
    </span>
  );
}
