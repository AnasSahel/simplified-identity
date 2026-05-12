import Link from "next/link";

import { cn } from "@/lib/utils";

export type ViewTab = {
  key: string;
  label: string;
  count?: number;
};

export function ViewTabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: ViewTab[];
  active: string;
  hrefFor: (key: string) => string;
}) {
  return (
    <div className="-mb-px flex items-center gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-medium",
                  isActive
                    ? "bg-muted text-foreground"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
