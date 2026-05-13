"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, X } from "lucide-react";

import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

/**
 * Free-text department filter. ISC tenants don't expose a stable
 * department dictionary — the safest UX is a debounced text input that
 * pushes `?department=<exact>` and lets the search API do the matching.
 *
 * No suggestions: the search index ships an Elastic `aggregation` on
 * `attributes.department.exact` that we could plug in later (issue
 * follow-up), but v0 keeps the dependency surface narrow.
 */
export function DepartmentFilter({ initial }: { initial: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(initial ?? "");
  const [previousInitial, setPreviousInitial] = React.useState(initial ?? "");

  // Prop-driven reset (e.g. "Clear filters"). Sync during render, not via
  // useEffect — same pattern as SearchBox.
  if ((initial ?? "") !== previousInitial) {
    setPreviousInitial(initial ?? "");
    setValue(initial ?? "");
  }

  React.useEffect(() => {
    if (value === (initial ?? "")) return;
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      const trimmed = value.trim();
      if (trimmed) params.set("department", trimmed);
      else params.delete("department");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, initial, pathname, router, searchParams]);

  const active = value.trim().length > 0;

  return (
    <div
      className={cn(
        "relative flex h-9 min-w-[12rem] items-center rounded-md border border-input bg-card text-sm",
        active && "border-foreground/30",
      )}
    >
      <Building2
        className="pointer-events-none ml-2.5 h-3.5 w-3.5 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Department"
        className="h-9 w-full bg-transparent pl-2 pr-7 placeholder:text-muted-foreground focus-visible:outline-none"
        aria-label="Filter by department"
      />
      {active && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent"
          aria-label="Clear department filter"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
