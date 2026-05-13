"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

export type ScopeFilterValue = "all" | "standard" | "custom";

const NON_DEFAULT_OPTIONS: { value: "standard" | "custom"; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "custom", label: "Custom" },
];

/**
 * Standard vs custom toggle. The factory already accepts a `scope` param
 * (`"all" | "standard" | "custom"`) — we just route the URL value into it.
 */
export function ScopeFilter({ selected }: { selected: ScopeFilterValue }) {
  const pathname = usePathname();
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
        if (value) params.set("scope", value);
        else params.delete("scope");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
