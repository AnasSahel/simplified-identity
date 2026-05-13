"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 250;

/**
 * Debounced free-text search.
 *
 * Pushes `q` into the URL after the user stops typing (250 ms idle). We use
 * `router.replace` rather than `router.push` so the back button doesn't get
 * a stack entry for every keystroke. The page is a server component, so the
 * URL change re-runs the server `listIdentities` call automatically.
 *
 * Clearing or changing `q` always resets pagination to page 1.
 */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(initial);
  const [previousInitial, setPreviousInitial] = React.useState(initial);

  // Sync local state when the URL changes from outside (e.g. via the
  // "Clear filters" link). React's recommended pattern for prop-driven
  // resets is to detect the change during render and call setState then —
  // not inside a useEffect, which fires too late and creates a flash of
  // stale UI. See "You Might Not Need an Effect" in the React docs.
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    setValue(initial);
  }

  React.useEffect(() => {
    if (value === initial) return;
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, initial, pathname, router, searchParams]);

  return (
    <div className="relative min-w-[16rem] flex-1">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, email or employee #…"
        className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Search identities"
      />
    </div>
  );
}
