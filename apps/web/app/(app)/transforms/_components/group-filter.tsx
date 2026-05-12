"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Layers } from "lucide-react";

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
import {
  TRANSFORM_GROUPS,
  type TransformGroupSlug,
} from "@/lib/sailpoint/transform-groups";

export function GroupFilter({
  availableGroups,
  selected,
}: {
  availableGroups: TransformGroupSlug[];
  selected: TransformGroupSlug | null;
}) {
  const searchParams = useSearchParams();

  function hrefFor(slug: TransformGroupSlug | null): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (slug) params.set("group", slug);
    else params.delete("group");
    const qs = params.toString();
    return qs ? `/transforms?${qs}` : "/transforms";
  }

  const label = selected
    ? `Group: ${TRANSFORM_GROUPS[selected].label}`
    : "Group";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          selected && "border-foreground/30",
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by group
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={hrefFor(null)}>
            <span className="flex-1">All groups</span>
            {!selected && <Check className="h-3.5 w-3.5" />}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {availableGroups.map((slug) => (
          <DropdownMenuItem key={slug} asChild>
            <Link href={hrefFor(slug)}>
              <span className="flex-1">{TRANSFORM_GROUPS[slug].label}</span>
              {selected === slug && <Check className="h-3.5 w-3.5" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
