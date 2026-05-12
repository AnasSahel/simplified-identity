"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, Filter } from "lucide-react";

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
 * Static lifecycle-state list. Lifecycle states are technically tenant-
 * defined (per identity profile), but in practice every tenant uses some
 * subset of these five. The dropdown is a usability shortcut — for an
 * exotic state name a user can still hit the underlying API by URL.
 */
export const LCS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "prehire", label: "Pre-hire" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
];

export function LcsFilter({ selected }: { selected: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(value: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) params.set("lcs", value);
    else params.delete("lcs");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const currentLabel = selected
    ? (LCS_OPTIONS.find((o) => o.value === selected)?.label ?? selected)
    : null;
  const label = currentLabel ? `LCS: ${currentLabel}` : "Lifecycle state";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          selected && "border-foreground/30",
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by lifecycle state
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={hrefFor(null)}>
            <span className="flex-1">Any state</span>
            {selected === null && <Check className="h-3.5 w-3.5" />}
          </Link>
        </DropdownMenuItem>
        {LCS_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.value} asChild>
            <Link href={hrefFor(opt.value)}>
              <span className="flex-1">{opt.label}</span>
              {selected === opt.value && <Check className="h-3.5 w-3.5" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
