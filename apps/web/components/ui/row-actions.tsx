"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
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
 * `<RowActions>` — unified row kebab menu. See DESIGN.md §2.11.
 * Dialogs (Delete, Duplicate, etc.) are mounted by the caller; this
 * component only triggers via `onSelect`.
 */

type ItemBase = {
  label: string;
  icon?: React.ReactNode;
  /** Renders `text-rose-*` + danger focus. */
  tone?: "default" | "danger";
};

export type RowActionItem =
  | (ItemBase & { divider?: never; href: string; onSelect?: never; pending?: never })
  | (ItemBase & { divider?: never; href?: never; onSelect: (e: Event) => void; pending?: boolean })
  | { divider: true; label?: never; icon?: never; tone?: never; href?: never; onSelect?: never; pending?: never };

export function RowActions({
  label,
  items,
  header,
  className,
}: {
  /** ARIA label for the trigger. e.g. `Actions for ${row.name}`. */
  label: string;
  items: RowActionItem[];
  /** Optional header rendered above the items (e.g. row name as caption). */
  header?: React.ReactNode;
  className?: string;
}) {
  const anyPending = items.some(
    (item) => !item.divider && "pending" in item && item.pending,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn(
            "h-7 w-7 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
            className,
          )}
        >
          {anyPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {header && (
          <>
            <DropdownMenuLabel className="si-caption text-muted-foreground">
              {header}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {items.map((item, idx) => {
          if (item.divider) {
            return <DropdownMenuSeparator key={`d-${idx}`} />;
          }
          const itemClass = cn(
            "gap-2",
            item.tone === "danger" &&
              "text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-300",
          );
          if ("href" in item && item.href) {
            return (
              <DropdownMenuItem key={item.label} asChild className={itemClass}>
                <Link href={item.href}>
                  {item.icon}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuItem
              key={item.label}
              className={itemClass}
              onSelect={(e) => {
                // Keep the dropdown's auto-close, but defer side effects
                // by a tick so Radix doesn't fight a downstream dialog's
                // focus trap when the dropdown unmounts.
                e.preventDefault();
                setTimeout(() => item.onSelect?.(e), 0);
              }}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
