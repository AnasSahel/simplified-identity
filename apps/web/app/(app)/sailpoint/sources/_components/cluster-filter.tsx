"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

/**
 * Single-select Cluster filter.
 *
 * URL: `?cluster=<cluster-id>` → server maps to
 * `filters=cluster.id eq "..."`. Options derived from the same
 * tenant-wide lookup that populates the Connector dropdown — see
 * `buildClusterOptions` on the page.
 */
export function ClusterFilter({
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
      label="Cluster"
      value={selected}
      options={options}
      clearLabel="Any cluster"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("cluster", value);
        else params.delete("cluster");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
