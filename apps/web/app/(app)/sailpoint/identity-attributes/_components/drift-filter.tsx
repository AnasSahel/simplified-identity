"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

/**
 * `?scope=drift` toggle. Sibling of `unused-filter` — both ride on the
 * same `scope` URL param so they're mutually exclusive (toggling Drift
 * clears Unused and vice versa). The page-side filter narrows rows to
 * `tier IN ("warning", "danger")` when active.
 *
 * Single-option drop-down rather than a plain toggle button so the
 * filter row stays visually homogeneous with the other dropdowns.
 */
export function DriftFilter({ selected }: { selected: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Drift"
      value={selected ? "drift" : null}
      options={[{ value: "drift", label: "Warning + Danger" }]}
      clearLabel="All attributes"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("scope", "drift");
        else params.delete("scope");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
