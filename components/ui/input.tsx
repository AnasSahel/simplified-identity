import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Design System Phase 2 — additive Input variant.
 *
 * `default` keeps the original shadcn neutral input used everywhere
 * (sign-in form, transforms editor, filters).
 *
 * `pill-search` mirrors DESIGN.md § `search-input`: white canvas,
 * `.ds-body` typography (17px / 400), 1px `rgba(0,0,0,0.08)` border,
 * `rounded-ds-pill`, padding 12px × 20px, height 44px. Designed for
 * search inputs (the "find a transform" topbar in Phase 3).
 *
 * `leadingIcon`: optional. When provided AND `variant="pill-search"`,
 * the component renders a relative wrapper with the icon absolutely
 * positioned. Ignored for other variants — passing it to `default`
 * is a no-op (renders the plain input without wrapper). This keeps
 * the prop additive and the call signature backward-compatible.
 *
 * See ADR: vault/Projects/Simplified Identity/2026-05-11-design-system-phase-2-primitives.md
 */
const inputVariants = cva(
  "flex w-full transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
        "pill-search":
          "ds-body h-11 rounded-[var(--radius-ds-pill)] border border-[rgba(0,0,0,0.08)] bg-[var(--color-ds-canvas)] text-[var(--color-ds-ink)] py-[12px] px-[20px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ds-focus-blue)] focus-visible:ring-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  leadingIcon?: React.ReactNode;
}

function Input({
  className,
  type,
  variant,
  leadingIcon,
  ...props
}: InputProps) {
  // leadingIcon is honored only on the pill-search variant — the other
  // shapes don't have room for it without breaking layout assumptions.
  if (variant === "pill-search" && leadingIcon) {
    return (
      <div className="relative inline-flex w-full items-center">
        <span
          className="pointer-events-none absolute left-[18px] flex items-center text-[var(--color-ds-ink-muted-48)]"
          aria-hidden
        >
          {leadingIcon}
        </span>
        <input
          type={type}
          className={cn(inputVariants({ variant }), "pl-[42px]", className)}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
