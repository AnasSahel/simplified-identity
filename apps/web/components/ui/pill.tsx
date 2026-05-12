import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * `<Pill>` — the only badge primitive in the app. Six closed tones × two
 * shapes. Always `.si-micro` size, always bordered.
 *
 * See DESIGN.md §2.4. Banned in `app/(app)/**` and `app/(auth)/**`: ad-hoc
 * pills built with `rounded-full` + `bg-emerald-*` / `bg-amber-*` etc.
 *
 * Use domain wrappers (`<LifecyclePill>`, `<RiskPill>`, `<TypePill>`,
 * `<AccountStatusPill>`) when the tone derives from a domain state.
 */
const pillVariants = cva(
  "inline-flex items-center gap-1.5 border px-2 py-0.5 si-micro whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:
          "bg-muted text-foreground border-border",
        accent:
          "bg-primary/10 text-primary border-primary/20",
        success:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
        warning:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
        danger:
          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
        info:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60",
      },
      shape: {
        rounded: "rounded-md",
        square: "rounded-sm",
      },
      mono: {
        true: "font-mono",
        false: "",
      },
    },
    defaultVariants: {
      tone: "neutral",
      shape: "rounded",
      mono: false,
    },
  },
);

const dotVariants = cva("h-1.5 w-1.5 rounded-full shrink-0", {
  variants: {
    tone: {
      neutral: "bg-muted-foreground",
      accent: "bg-primary",
      success: "bg-emerald-500",
      warning: "bg-amber-500",
      danger: "bg-rose-500",
      info: "bg-sky-500",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type PillTone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;

type PillProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  keyof VariantProps<typeof pillVariants>
> &
  VariantProps<typeof pillVariants> & {
    /** Renders a leading tone-matched 6px dot. */
    dot?: boolean;
  };

export function Pill({
  tone,
  shape,
  mono,
  dot = false,
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(pillVariants({ tone, shape, mono }), className)}
      {...props}
    >
      {dot && <span aria-hidden className={dotVariants({ tone })} />}
      {children}
    </span>
  );
}
