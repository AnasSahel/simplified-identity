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

import { TypePill } from "../../_components/type-pill";

export function TypeFilter({
  availableTypes,
  selected,
}: {
  availableTypes: string[];
  selected: string | null;
}) {
  const searchParams = useSearchParams();

  function hrefForType(type: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (type) params.set("type", type);
    else params.delete("type");
    const qs = params.toString();
    return qs ? `/transforms?${qs}` : "/transforms";
  }

  const label = selected ? `Type: ${selected}` : "Type";

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
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by type
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={hrefForType(null)}>
            <span className="flex-1">All types</span>
            {!selected && <Check className="h-3.5 w-3.5" />}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {availableTypes.map((type) => (
          <DropdownMenuItem key={type} asChild>
            <Link href={hrefForType(type)}>
              <TypePill type={type} />
              <span className="flex-1" />
              {selected === type && <Check className="h-3.5 w-3.5" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
