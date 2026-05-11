import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

// Minimal Alert primitive — not the shadcn CLI version, but a hand-rolled
// one that supports the variants we actually need across the app. Keeps
// the surface narrow (variant + className + children) and lets each call
// site supply its own copy.
//
// DS Phase 2 re-skin:
// - `info` goes fully DS: parchment background + hairline border + ink text
//   + action-blue icon — matches DESIGN.md § Surface (parchment) and
//   § Brand & Accent.
// - `warning`, `error`, `success` keep their semantic palette (amber/rose/
//   emerald). DESIGN.md does not surface alert-state colors (Known Gaps:
//   "Form validation and error states were not surfaced"), so we hold on
//   to the established sensorial cue. Borders and body typography move
//   to the DS register (.ds-body / .ds-body-strong) for homogeneity.
//
// See ADR: vault/Projects/Simplified Identity/2026-05-11-design-system-phase-2-primitives.md

type AlertVariant = "info" | "warning" | "error" | "success";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "bg-[var(--color-ds-parchment)] border-[var(--color-ds-hairline)] text-[var(--color-ds-ink)] dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-200",
  warning:
    "bg-amber-50 border-[var(--color-ds-hairline)] text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-200",
  error:
    "bg-rose-50 border-[var(--color-ds-hairline)] text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-200",
  success:
    "bg-emerald-50 border-[var(--color-ds-hairline)] text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-200",
};

const ICON_TINTS: Record<AlertVariant, string> = {
  info: "text-[var(--color-ds-action-blue)]",
  warning: "text-amber-600 dark:text-amber-300",
  error: "text-rose-600 dark:text-rose-300",
  success: "text-emerald-600 dark:text-emerald-300",
};

const VARIANT_ICONS: Record<AlertVariant, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
};

export function Alert({
  variant = "info",
  className,
  icon = true,
  children,
}: {
  variant?: AlertVariant;
  className?: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  const Icon = VARIANT_ICONS[variant];
  return (
    <div
      role="alert"
      className={cn(
        "ds-body flex items-start gap-2 rounded-[var(--radius-ds-md)] border px-3 py-2",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {icon && (
        <Icon
          className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", ICON_TINTS[variant])}
          aria-hidden
        />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("ds-body-strong", className)}>{children}</p>;
}

export function AlertDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("opacity-90", className)}>{children}</p>;
}
