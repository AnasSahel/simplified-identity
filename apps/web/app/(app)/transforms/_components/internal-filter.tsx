"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export type InternalFilterValue = "all" | "custom" | "builtin";

const OPTIONS: { value: InternalFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
  { value: "builtin", label: "Built-in" },
];

export function InternalFilter({ selected }: { selected: InternalFilterValue }) {
  const searchParams = useSearchParams();

  function hrefFor(value: InternalFilterValue): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "all") params.delete("internal");
    else params.set("internal", value);
    const qs = params.toString();
    return qs ? `/transforms?${qs}` : "/transforms";
  }

  const current = OPTIONS.find((o) => o.value === selected) ?? OPTIONS[0];
  const label = selected === "all" ? "Origin" : `Origin: ${current.label}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          selected !== "all" && "border-foreground/30",
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by origin
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
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
