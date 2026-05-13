"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

export const AUTHORITATIVE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

/**
 * Single-select Authoritative filter.
 *
 * URL contract: `?auth=yes|no` (mirrors the brevity of other filter
 * params on this page). The server-side page translates to
 * `filters=authoritative eq true|false`.
 */
export function AuthoritativeFilter({ selected }: { selected: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Authoritative"
      value={selected}
      options={AUTHORITATIVE_OPTIONS as unknown as { value: string; label: string }[]}
      clearLabel="Any"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("auth", value);
        else params.delete("auth");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
