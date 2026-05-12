"use client";

import { useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

export type InternalFilterValue = "all" | "custom" | "builtin";

const NON_DEFAULT_OPTIONS: { value: "custom" | "builtin"; label: string }[] = [
  { value: "custom", label: "Custom" },
  { value: "builtin", label: "Built-in" },
];

export function InternalFilter({ selected }: { selected: InternalFilterValue }) {
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Origin"
      value={selected === "all" ? null : selected}
      options={NON_DEFAULT_OPTIONS}
      clearLabel="All"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("internal", value);
        else params.delete("internal");
        const qs = params.toString();
        return qs ? `/transforms?${qs}` : "/transforms";
      }}
    />
  );
}
