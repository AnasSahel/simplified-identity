"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

/**
 * Single-select connector-type filter.
 *
 * The spec calls for multi-select; we ship single-select for v0 because
 * `FilterDropdown` is single-value and the multi-select primitive doesn't
 * exist yet. SailPoint's `filters` grammar supports `in (...)` so the
 * server-side query can be widened later without breaking URL contracts.
 *
 * Options are derived from the tenant (a separate `listSources` call up to
 * 250) rather than a static list — connector identifiers vary per tenant
 * deployment.
 */
export function ConnectorFilter({
  options,
  selected,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Connector"
      value={selected}
      options={options}
      clearLabel="Any connector"
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
