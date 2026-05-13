"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import type { IdentityAttributeValueBucket } from "@/lib/sailpoint/identity-attributes-api";

const NUMBER_FMT = new Intl.NumberFormat("en-US");

const columns: ColumnDef<IdentityAttributeValueBucket, unknown>[] = [
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => (
      <span className="font-mono break-words">{row.original.value}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "count",
    header: "Identities",
    cell: ({ row }) => NUMBER_FMT.format(row.original.count),
    enableSorting: true,
    meta: { align: "right", widthClass: "w-32" },
  },
];

/**
 * Sample values tab — top N distinct values for this identity attribute
 * across the identities index, with their counts. Backed by a `terms`
 * aggregation on `attributes.<name>.exact`.
 *
 * `limit` is the requested top-N. When the result list is exactly
 * `limit` rows long we surface a truncation note — aggregations don't
 * paginate beyond `size`, so the true distinct value count may exceed
 * what we render.
 */
export function ValuesTab({
  values,
  limit,
}: {
  values: IdentityAttributeValueBucket[];
  limit: number;
}) {
  const truncated = values.length >= limit;

  return (
    <div className="space-y-2">
      <DataTable
        data={values}
        columns={columns}
        rowKey={(r) => r.value}
        emptyState="No values found in the identities index."
        defaultSorting={[{ id: "count", desc: true }]}
        mobileLayout="cards"
      />
      {truncated ? (
        <p className="si-caption text-muted-foreground">
          Showing the top {NUMBER_FMT.format(limit)} distinct values.
          Additional values may exist — SailPoint aggregations don&apos;t
          paginate beyond this size.
        </p>
      ) : null}
    </div>
  );
}
