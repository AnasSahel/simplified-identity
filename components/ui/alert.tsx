import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

// Minimal Alert primitive — not the shadcn CLI version, but a hand-rolled
// one that supports the variants we actually need across the app. Keeps
// the surface narrow (variant + className + children) and lets each call
// site supply its own copy.
//
// Why custom: the shadcn ships only `default` and `destructive` variants
// out of the box, and we want `warning` for the "runs in your browser"
// hint in the Test drawer (and likely others later — `info`, `success`).

type AlertVariant = "info" | "warning" | "error" | "success";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
  error:
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200",
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
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
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
  return <p className={cn("font-medium", className)}>{children}</p>;
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
