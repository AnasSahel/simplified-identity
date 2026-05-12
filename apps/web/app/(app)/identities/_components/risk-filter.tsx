"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { FilterDropdown } from "@/components/ui/filter-dropdown";

import { RISK_OPTIONS } from "./risk-pill";

export function RiskFilter({ selected }: { selected: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <FilterDropdown
      label="Risk"
      value={selected}
      options={RISK_OPTIONS}
      icon={<ShieldAlert className="h-3.5 w-3.5" />}
      clearLabel="Any level"
      hrefFor={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value) params.set("risk", value);
        else params.delete("risk");
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
      }}
    />
  );
}
