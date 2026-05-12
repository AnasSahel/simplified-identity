import Link from "next/link";
import * as React from "react";
import {
  AlertTriangle,
  Anchor,
  Inbox,
  KeyRound,
  ShieldOff,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `<StateView>` — single primitive for empty / error / forbidden /
 * not-connected / coming-soon page states. Replaces SailpointEmptyState,
 * inline PermissionDenied, inline TabFailure, ad-hoc empty divs.
 *
 * See DESIGN.md §2.7. Intent picks default icon + tone + action; consumer
 * can override any of them.
 *
 * Banned in `app/(app)/**`: hand-rolled empty / error / "no permission"
 * copy inside a Card or border-dashed div. Use this instead.
 */

export type StateViewIntent =
  | "empty"
  | "not_connected"
  | "auth_failed"
  | "api_error"
  | "forbidden"
  | "coming-soon";

type IntentSpec = {
  tone: "neutral" | "accent" | "warning" | "danger";
  icon: LucideIcon;
  action?: { label: string; href: string };
};

const INTENT: Record<StateViewIntent, IntentSpec> = {
  empty: { tone: "neutral", icon: Inbox },
  not_connected: {
    tone: "accent",
    icon: Anchor,
    action: { label: "Sign in with SailPoint", href: "/sign-in" },
  },
  auth_failed: {
    tone: "accent",
    icon: KeyRound,
    action: { label: "Sign in again", href: "/sign-in" },
  },
  api_error: {
    tone: "danger",
    icon: AlertTriangle,
    action: { label: "Back to dashboard", href: "/dashboard" },
  },
  forbidden: { tone: "warning", icon: ShieldOff },
  "coming-soon": {
    tone: "accent",
    icon: Sparkles,
    action: { label: "Back to dashboard", href: "/dashboard" },
  },
};

const iconBoxVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-primary/10 text-primary",
        warning:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        danger:
          "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      },
      size: {
        md: "h-10 w-10",
        sm: "h-7 w-7",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

const containerVariants = cva("", {
  variants: {
    size: {
      md: "mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center",
      sm: "flex items-start gap-3 rounded-md border border-dashed px-4 py-6",
    },
    tone: {
      neutral: "",
      accent: "",
      warning: "",
      danger: "",
    },
  },
  compoundVariants: [
    // Tint dashed border + bg slightly per tone on `sm`.
    {
      size: "sm",
      tone: "warning",
      class:
        "border-amber-300/70 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20",
    },
    {
      size: "sm",
      tone: "danger",
      class:
        "border-rose-300/70 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20",
    },
  ],
  defaultVariants: { size: "md", tone: "neutral" },
});

type IconSize = NonNullable<VariantProps<typeof iconBoxVariants>["size"]>;

export type StateViewProps = {
  intent: StateViewIntent;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Mono caption rendered below description — for status codes / error keys. */
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Pass `null` to suppress the default action for an intent. */
  size?: IconSize;
  className?: string;
};

export function StateView({
  intent,
  title,
  description,
  detail,
  icon,
  action,
  size = "md",
  className,
}: StateViewProps) {
  const spec = INTENT[intent];
  const Icon = spec.icon;
  const resolvedAction =
    action === null
      ? null
      : (action ??
        (spec.action ? (
          <Button asChild variant="outline" size="sm">
            <Link href={spec.action.href}>{spec.action.label}</Link>
          </Button>
        ) : null));

  if (size === "sm") {
    return (
      <div className={cn(containerVariants({ size, tone: spec.tone }), className)}>
        <span className={iconBoxVariants({ tone: spec.tone, size: "sm" })} aria-hidden>
          {icon ?? <Icon className="h-3.5 w-3.5" />}
        </span>
        <div className="flex-1 space-y-1">
          {title && <p className="si-section text-foreground">{title}</p>}
          {description && (
            <p className="si-body text-muted-foreground">{description}</p>
          )}
          {detail && (
            <p className="si-caption font-mono text-muted-foreground">{detail}</p>
          )}
          {resolvedAction && <div className="pt-2">{resolvedAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(containerVariants({ size, tone: spec.tone }), className)}>
      <span
        className={iconBoxVariants({ tone: spec.tone, size: "md" })}
        aria-hidden
      >
        {icon ?? <Icon className="h-5 w-5" />}
      </span>
      {title && <h2 className="si-section">{title}</h2>}
      {description && (
        <p className="si-body text-muted-foreground">{description}</p>
      )}
      {detail && (
        <p className="si-caption font-mono text-muted-foreground">{detail}</p>
      )}
      {resolvedAction && <div className="pt-1">{resolvedAction}</div>}
    </div>
  );
}
