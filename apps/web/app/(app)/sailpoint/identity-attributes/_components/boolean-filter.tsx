"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

export type BooleanFilterValue = "all" | "yes" | "no";

const NON_DEFAULT_OPTIONS: { value: "yes" | "no"; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/**
 * Generic three-way toggle for a boolean attribute (yes / no / any).
 * Used for both `searchable` and `multi-valued` filters — the only
 * difference is the URL param key and the visible label.
 */
export function BooleanFilter({
  label,
  paramKey,
  selected,
}: {
  label: string;
  paramKey: string;
  selected: BooleanFilterValue;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label={label}
      value={selected === "all" ? null : selected}
      options={NON_DEFAULT_OPTIONS}
      clearLabel="Any"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set(paramKey, value);
        else params.delete(paramKey);
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
