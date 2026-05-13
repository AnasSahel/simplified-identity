import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type Layout = "table" | "grid";

export function LayoutToggle({
  layout,
  hrefFor,
}: {
  layout: Layout;
  hrefFor: (l: Layout) => string;
}) {
  const baseBtn =
    "inline-flex h-8 w-8 items-center justify-center transition-colors";
  return (
    <div
      role="group"
      aria-label="Layout"
      className="inline-flex overflow-hidden rounded-md border bg-card"
    >
      <Link
        href={hrefFor("table")}
        aria-label="Table view"
        aria-current={layout === "table" ? "page" : undefined}
        className={cn(
          baseBtn,
          "border-r",
          layout === "table"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <List className="h-3.5 w-3.5" />
      </Link>
      <Link
        href={hrefFor("grid")}
        aria-label="Grid view"
        aria-current={layout === "grid" ? "page" : undefined}
        className={cn(
          baseBtn,
          layout === "grid"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
