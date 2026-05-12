"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ShieldAlert } from "lucide-react";

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

import { RISK_OPTIONS } from "./risk-pill";

export function RiskFilter({ selected }: { selected: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(value: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) params.set("risk", value);
    else params.delete("risk");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const currentLabel = selected
    ? (RISK_OPTIONS.find((o) => o.value === selected)?.label ?? selected)
    : null;
  const label = currentLabel ? `Risk: ${currentLabel}` : "Risk";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          selected && "border-foreground/30",
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by risk score
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={hrefFor(null)}>
            <span className="flex-1">Any level</span>
            {selected === null && <Check className="h-3.5 w-3.5" />}
          </Link>
        </DropdownMenuItem>
        {RISK_OPTIONS.map((opt) => (
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
