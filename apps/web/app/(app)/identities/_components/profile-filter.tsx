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

export type ProfileOption = { id: string; name: string };

export function ProfileFilter({
  options,
  selected,
}: {
  options: ProfileOption[];
  /** Currently selected profile id, or null for "All profiles". */
  selected: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(value: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) params.set("profile", value);
    else params.delete("profile");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const currentName = selected
    ? options.find((o) => o.id === selected)?.name
    : null;
  const label = currentName ? `Profile: ${currentName}` : "Profile";

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
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter by identity profile
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={hrefFor(null)}>
            <span className="flex-1">All profiles</span>
            {selected === null && <Check className="h-3.5 w-3.5" />}
          </Link>
        </DropdownMenuItem>
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No profiles available.
          </div>
        ) : (
          options.map((opt) => (
            <DropdownMenuItem key={opt.id} asChild>
              <Link href={hrefFor(opt.id)}>
                <span className="flex-1 truncate">{opt.name}</span>
                {selected === opt.id && <Check className="h-3.5 w-3.5" />}
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
