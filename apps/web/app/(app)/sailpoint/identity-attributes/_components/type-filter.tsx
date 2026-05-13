"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

/**
 * Identity-attribute type filter.
 *
 * The spec calls for multi-select; we ship single-select for v0 because
 * `FilterDropdown` is single-value and the multi-select primitive doesn't
 * exist yet. The page filters in-process anyway (the tenant carries ~20–60
 * rows), so widening to a multi-value contract later is a UI-only change.
 *
 * Options are derived from the live payload (whatever types the tenant
 * exposes) rather than a hardcoded list — tenants do occasionally surface
 * uncommon types here.
 */
export function TypeFilter({
  availableTypes,
  selected,
}: {
  availableTypes: string[];
  selected: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Type"
      value={selected}
      options={availableTypes.map((t) => ({ value: t, label: t }))}
      clearLabel="All types"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("type", value);
        else params.delete("type");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
