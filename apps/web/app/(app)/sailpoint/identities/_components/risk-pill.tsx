import { Pill, type PillTone } from "@/components/ui/pill";

/**
 * Risk score pill. ISC's `identityRiskScore` field exposes a bucket
 * string when the tenant has Cloud Access Management / Identity Risk
 * Score enabled. Four known buckets map to tones; anything else falls
 * back to neutral. Null renders as `—` to keep the column height stable.
 *
 * See DESIGN.md §2.4 — domain wrapper pattern.
 */
const TONE: Record<string, PillTone> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

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
        className="si-caption text-muted-foreground/50"
        aria-label="No risk score"
      >
        —
      </span>
    );
  }
  const lower = value.toLowerCase();
  const label =
    RISK_OPTIONS.find((o) => o.value === lower)?.label ?? value;
  return <Pill tone={TONE[lower] ?? "neutral"}>{label}</Pill>;
}
