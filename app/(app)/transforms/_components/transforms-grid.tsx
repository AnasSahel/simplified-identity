"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

import { TypeIcon, TypePill } from "../../_components/type-pill";
import { RowActions } from "./row-actions";

export type GridTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  usages?: number;
};

export function TransformsGrid({ transforms }: { transforms: GridTransform[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectHref = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("selected", id);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams],
  );

  if (transforms.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
        No transforms in this view.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {transforms.map((t) => (
        <div
          key={t.id}
          className="group relative flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <Link
              href={selectHref(t.id)}
              scroll={false}
              className="flex min-w-0 items-center gap-2 hover:underline"
            >
              <TypeIcon type={t.type} />
              <span className="truncate font-mono text-xs font-medium">
                {t.name}
              </span>
            </Link>
            <RowActions id={t.id} name={t.name} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <TypePill type={t.type} />
            <div className="flex items-center gap-2">
              {t.usages !== undefined && (
                <span
                  title={`${t.usages} usage${t.usages === 1 ? "" : "s"}`}
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    t.usages === 0
                      ? "text-muted-foreground/55"
                      : "text-muted-foreground",
                  )}
                >
                  {t.usages} use{t.usages === 1 ? "" : "s"}
                </span>
              )}
              <span
                aria-label={t.internal ? "Built-in" : "Custom"}
                title={t.internal ? "Built-in" : "Custom"}
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded",
                  t.internal
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/50",
                )}
              >
                {t.internal ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
