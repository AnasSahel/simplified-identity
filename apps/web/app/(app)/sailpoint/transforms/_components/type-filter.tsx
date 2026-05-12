"use client";

import { useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

export function TypeFilter({
  availableTypes,
  selected,
}: {
  availableTypes: string[];
  selected: string | null;
}) {
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
        return qs ? `/sailpoint/transforms?${qs}` : "/sailpoint/transforms";
      }}
    />
  );
}
