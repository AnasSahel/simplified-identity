"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

/**
 * Static lifecycle-state list. Lifecycle states are technically tenant-
 * defined (per identity profile), but in practice every tenant uses some
 * subset of these five. For an exotic state name the user can still hit
 * the underlying API by URL.
 */
export const LCS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "prehire", label: "Pre-hire" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
];

export function LcsFilter({ selected }: { selected: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Lifecycle state"
      value={selected}
      options={LCS_OPTIONS}
      clearLabel="Any state"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("lcs", value);
        else params.delete("lcs");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
