"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Check, Minus } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

import { TypeIcon, TypePill } from "../../_components/type-pill";
import { BulkActionBar } from "./bulk-action-bar";
import { RowActions } from "./row-actions";
import type { SelectableTransform } from "./types";

function makeColumns(
  tenantTransformNames: ReadonlyArray<string>,
): ColumnDef<SelectableTransform, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { widthClass: "w-[55%]" },
      cell: ({ row }) => (
        <div className="flex w-full items-center gap-2 font-mono si-caption">
          <TypeIcon type={row.original.type} />
          <span className="truncate">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <TypePill type={row.original.type} />,
    },
    {
      id: "usages",
      accessorKey: "usages",
      header: "Usages",
      meta: { widthClass: "w-20", align: "right" },
      cell: ({ row }) => {
        const v = row.original.usages;
        if (v === undefined) {
          return <span className="text-muted-foreground/40">—</span>;
        }
        return (
          <span
            className={cn(
              "font-mono tabular-nums si-caption",
              v === 0 ? "text-muted-foreground/55" : "text-foreground",
            )}
          >
            {v}
          </span>
        );
      },
      sortingFn: (a, b) =>
        (a.original.usages ?? 0) - (b.original.usages ?? 0),
    },
    {
      id: "internal",
      accessorKey: "internal",
      header: "Internal",
      meta: { align: "center" },
      cell: ({ row }) => {
        const v = row.original.internal;
        return (
          <span
            aria-label={v ? "Built-in" : "Custom"}
            title={v ? "Built-in" : "Custom"}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center",
              v
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground/50",
            )}
          >
            {v ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
          </span>
        );
      },
      sortingFn: (a, b) =>
        Number(!!a.original.internal) - Number(!!b.original.internal),
    },
  ];
}

export function TransformsTable({
  data,
  tenantTransformNames,
}: {
  data: SelectableTransform[];
  /** Live list of all transform names in the tenant — fed to row-level
   * Duplicate so the dialog can pre-compute a unique default name. */
  tenantTransformNames: ReadonlyArray<string>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectHref = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("selected", id);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams],
  );

  const columns = React.useMemo(
    () => makeColumns(tenantTransformNames),
    [tenantTransformNames],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(r) => r.id}
      selection
      defaultSorting={[{ id: "name", desc: false }]}
      rowHref={(r) => selectHref(r.id)}
      rowActions={(r) => (
        <RowActions
          id={r.id}
          name={r.name}
          usages={r.usages}
          internal={r.internal}
          tenantTransformNames={tenantTransformNames}
        />
      )}
      toolbar={({ selectedIds, clearSelection }) => {
        if (selectedIds.length === 0) return null;
        const selectedRows = data.filter((d) => selectedIds.includes(d.id));
        return (
          <BulkActionBar selected={selectedRows} onClear={clearSelection} />
        );
      }}
      emptyState="No transforms in this view."
    />
  );
}
