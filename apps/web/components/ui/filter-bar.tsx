import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `<FilterBar>` — container for a search box + filter dropdowns +
 * "Clear filters" link. See DESIGN.md §2.9.
 */
export function FilterBar({
  search,
  filters,
  clearHref,
  trailing,
  className,
}: {
  search?: React.ReactNode;
  filters: React.ReactNode;
  /** When provided, renders a "Clear filters" ghost button linking to it. */
  clearHref?: string;
  /** Right-aligned slot (e.g. layout toggle, view density). */
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {search}
      {filters}
      {clearHref && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={clearHref}>Clear filters</Link>
        </Button>
      )}
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
