import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * `<Pagination>` — page-size dropdown + page-numbers + prev/next.
 * See DESIGN.md §2.10. Built to be consumed by `<DataTable>` (PR-6) and
 * directly by list pages.
 */

export type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  perPage: number;
  perPageOptions: readonly number[];
  /** Build the URL for a given page (with per-page kept from the caller's state). */
  hrefForPage: (page: number) => string;
  /** Build the URL for a given per-page value. Should reset page to 1. */
  hrefForPerPage: (perPage: number) => string;
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  perPage,
  perPageOptions,
  hrefForPage,
  hrefForPerPage,
  className,
}: PaginationProps) {
  if (total === 0) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const items = pagesToRender(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="si-caption text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2",
            )}
          >
            {perPage} / page
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {perPageOptions.map((n) => (
              <DropdownMenuItem key={n} asChild>
                <Link href={hrefForPerPage(n)}>
                  {n} / page
                  {n === perPage && <Check className="ml-auto h-4 w-4" />}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          {prevDisabled ? (
            <Button variant="ghost" size="sm" disabled aria-disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only">Previous</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={hrefForPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="sr-only">Previous</span>
              </Link>
            </Button>
          )}

          <div className="hidden items-center gap-1 sm:flex">
            {items.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  aria-hidden
                  className="si-body px-2 text-muted-foreground"
                >
                  …
                </span>
              ) : item === page ? (
                <span
                  key={item}
                  aria-current="page"
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground si-body font-medium px-2 text-background"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={hrefForPage(item)}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 si-body text-foreground transition-colors hover:bg-accent"
                >
                  {item}
                </Link>
              ),
            )}
          </div>

          <span className="si-caption px-1 text-foreground sm:hidden">
            {page} / {totalPages}
          </span>

          {nextDisabled ? (
            <Button variant="ghost" size="sm" disabled aria-disabled>
              <span className="sr-only">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={hrefForPage(page + 1)}>
                <span className="sr-only">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 1, 2, … 7 | 1, 2, 3, 4, 5, …, N | 1, …, n-1, n, n+1, …, N */
function pagesToRender(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}
