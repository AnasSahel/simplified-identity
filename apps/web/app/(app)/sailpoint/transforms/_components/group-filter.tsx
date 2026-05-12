"use client";

import { useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";

import { FilterDropdown } from "@/components/ui/filter-dropdown";
import {
  TRANSFORM_GROUPS,
  type TransformGroupSlug,
} from "@simplified-identity/transforms";

export function GroupFilter({
  availableGroups,
  selected,
}: {
  availableGroups: TransformGroupSlug[];
  selected: TransformGroupSlug | null;
}) {
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Group"
      value={selected}
      options={availableGroups.map((slug) => ({
        value: slug,
        label: TRANSFORM_GROUPS[slug].label,
      }))}
      icon={<Layers className="h-3.5 w-3.5" />}
      clearLabel="All groups"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("group", value);
        else params.delete("group");
        const qs = params.toString();
        return qs ? `/sailpoint/transforms?${qs}` : "/sailpoint/transforms";
      }}
    />
  );
}
