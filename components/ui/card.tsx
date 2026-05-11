import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Design System Phase 2 — additive Card variant.
 *
 * `default` keeps the original shadcn surface (rounded-lg + border + bg-card
 * + shadow-sm) used by StepCard and other call sites.
 *
 * `utility` mirrors DESIGN.md § `store-utility-card`: white canvas, 1px
 * hairline border, `rounded-ds-lg` (18px), padding `ds-lg` (24px),
 * **no shadow**. Reserved for Phase 3 store/accessories grids and
 * feature cards.
 *
 * See ADR: vault/Projects/Simplified Identity/2026-05-11-design-system-phase-2-primitives.md
 */
const cardVariants = cva("", {
  variants: {
    variant: {
      default: "rounded-lg border bg-card text-card-foreground shadow-sm",
      utility:
        "bg-[var(--color-ds-canvas)] border border-[var(--color-ds-hairline)] rounded-[var(--radius-ds-lg)] p-[var(--spacing-ds-lg)] text-[var(--color-ds-ink)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
