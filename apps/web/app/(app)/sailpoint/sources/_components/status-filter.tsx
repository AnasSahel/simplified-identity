"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

import { STATUS_OPTIONS } from "./status-filter-shared";

/**
 * Single-select status filter. The three buckets mirror `<SourceStatusPill>`
 * — see that component for the mapping rationale.
 *
 * URL contract: `?status=connected|disconnected|error`. The server-side
 * page translates these into SailPoint `filters` expressions on `healthy`
 * so the URL stays stable across API grammar shifts.
 *
 * Note: `STATUS_OPTIONS` and the `StatusFilterValue` type live in
 * `./status-filter-shared` (no "use client") so the server page can
 * import them without Next serializing them as client references.
 */
export function StatusFilter({ selected }: { selected: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Status"
      value={selected}
      options={STATUS_OPTIONS as unknown as { value: string; label: string }[]}
      clearLabel="Any status"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("status", value);
        else params.delete("status");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
