import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Design System Phase 2 — additive Apple-style variants.
 *
 * The `default | destructive | outline | secondary | ghost | link` set is
 * the original shadcn surface. Phase 2 adds the `pill-primary`,
 * `secondary-pill`, `dark-utility`, `pearl-capsule`, and `store-hero`
 * variants documented in DESIGN.md. They consume `--color-ds-*` and
 * `--radius-ds-*` tokens posed in Phase 1.
 *
 * Sizing note: cva concatenates `base + variant + size + compoundVariants
 * + className`. The default `size` carries `h-9 px-4 py-2`. To make the
 * DS variants self-contained (their padding/height encoded in the
 * variant spec), we move their box metrics into `compoundVariants` so
 * they land AFTER the size classes — tailwind-merge then keeps the
 * variant-specific values.
 *
 * DESIGN.md forbids hover treatments — DS variants have no `hover:`
 * classes. Only active/pressed (`scale-95`) and the focus outline are
 * decorated.
 *
 * See ADR: vault/Projects/Simplified Identity/2026-05-11-design-system-phase-2-primitives.md
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // ---- DS Phase 2 variants -----------------------------------------
        // Colors, typo, radius, focus, press state. Box metrics (h-auto,
        // padding) live in `compoundVariants` to win over `size: default`.
        "pill-primary":
          "ds-body bg-[var(--color-ds-action-blue)] text-[var(--color-ds-body-on-dark)] rounded-[var(--radius-ds-pill)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ds-focus-blue)] focus-visible:ring-0",
        "secondary-pill":
          "ds-body bg-transparent text-[var(--color-ds-action-blue)] border border-[var(--color-ds-action-blue)] rounded-[var(--radius-ds-pill)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ds-focus-blue)] focus-visible:ring-0",
        "dark-utility":
          "ds-button-utility bg-[var(--color-ds-ink)] text-[var(--color-ds-body-on-dark)] rounded-[var(--radius-ds-sm)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ds-focus-blue)] focus-visible:ring-0",
        "pearl-capsule":
          "ds-caption bg-[var(--color-ds-pearl)] text-[var(--color-ds-ink-muted-80)] border-[3px] border-[var(--color-ds-divider-soft)] rounded-[var(--radius-ds-md)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ds-focus-blue)] focus-visible:ring-0",
        "store-hero":
          "ds-button-large bg-[var(--color-ds-action-blue)] text-[var(--color-ds-body-on-dark)] rounded-[var(--radius-ds-pill)] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ds-focus-blue)] focus-visible:ring-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    compoundVariants: [
      {
        variant: "pill-primary",
        size: "default",
        className: "h-auto px-[22px] py-[11px]",
      },
      {
        variant: "secondary-pill",
        size: "default",
        className: "h-auto px-[22px] py-[11px]",
      },
      {
        variant: "dark-utility",
        size: "default",
        className: "h-auto px-[15px] py-[8px]",
      },
      {
        variant: "pearl-capsule",
        size: "default",
        className: "h-auto px-[14px] py-[8px]",
      },
      {
        variant: "store-hero",
        size: "default",
        className: "h-auto px-[28px] py-[14px]",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
