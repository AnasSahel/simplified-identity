"use client";

import Link from "next/link";
import { Check, ChevronDown, Filter } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * `<FilterDropdown>` — single-value closed-list filter trigger. Active
 * state tinted via `--primary`. See DESIGN.md §2.9.
 *
 * For free-text combobox filters (e.g. Department), use a different
 * primitive — this one is for fixed option sets only.
 */
export function FilterDropdown({
  label,
  value,
  options,
  hrefFor,
  clearLabel = "Any",
  icon,
}: {
  /** Button label when no value is selected. Used as `"{label}: {currentLabel}"` when active. */
  label: string;
  value: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Build the URL for a given value (`null` clears the filter). */
  hrefFor: (value: string | null) => string;
  /** Label for the "no filter" option in the menu. Defaults to "Any". */
  clearLabel?: string;
  /** Leading icon on the trigger. Defaults to a Filter icon. */
  icon?: React.ReactNode;
}) {
  const active = value !== null;
  const currentLabel = active
    ? (options.find((o) => o.value === value)?.label ?? value)
    : null;
  const buttonLabel = currentLabel ? `${label}: ${currentLabel}` : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          active && "border-primary/40 bg-primary/5 text-primary",
        )}
      >
        {icon ?? <Filter className="h-3.5 w-3.5" />}
        {buttonLabel}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="si-caption text-muted-foreground">
          Filter by {label.toLowerCase()}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={hrefFor(null)}>
            <span className="flex-1">{clearLabel}</span>
            {!active && <Check className="h-3.5 w-3.5" />}
          </Link>
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.value} asChild>
            <Link href={hrefFor(o.value)}>
              <span className="flex-1">{o.label}</span>
              {value === o.value && <Check className="h-3.5 w-3.5" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
