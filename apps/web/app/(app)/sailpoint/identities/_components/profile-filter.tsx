"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

export type ProfileOption = { id: string; name: string };

export function ProfileFilter({
  options,
  selected,
}: {
  options: ProfileOption[];
  /** Currently selected profile id, or null for "All profiles". */
  selected: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Profile"
      value={selected}
      options={options.map((o) => ({ value: o.id, label: o.name }))}
      clearLabel="All profiles"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("profile", value);
        else params.delete("profile");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
