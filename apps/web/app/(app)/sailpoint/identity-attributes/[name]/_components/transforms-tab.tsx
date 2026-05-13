"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import type { AttributeUsageInTransform } from "@/lib/sailpoint/identity-attributes-api";

/**
 * Row shape for the Transforms tab table. We aggregate the walker's raw
 * usages — which emit one row per matched node — into one row per
 * transform, with the count of usages and the first path collapsed into
 * a sub-line. This matches the "transform table" patterns elsewhere in
 * the app: list transforms, not their internal occurrences.
 */
type TransformRow = {
  transformId: string;
  transformName: string;
  usageCount: number;
  firstPath: string;
};

function aggregateUsages(
  usages: AttributeUsageInTransform[],
): TransformRow[] {
  const byId = new Map<string, TransformRow>();
  for (const usage of usages) {
    const existing = byId.get(usage.transformId);
    if (existing) {
      existing.usageCount += 1;
    } else {
      byId.set(usage.transformId, {
        transformId: usage.transformId,
        transformName: usage.transformName,
        usageCount: 1,
        firstPath: usage.attributePath,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.transformName.localeCompare(b.transformName),
  );
}

const columns: ColumnDef<TransformRow, unknown>[] = [
  {
    accessorKey: "transformName",
    header: "Transform",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.transformName}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "firstPath",
    header: "Path",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {row.original.firstPath}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "usageCount",
    header: "Usages",
    cell: ({ row }) => row.original.usageCount,
    enableSorting: true,
    meta: { align: "right", widthClass: "w-24" },
  },
];

/**
 * Transforms tab — table of transforms that reference this attribute as
 * an `{type:"identityAttribute"}` source node. Each row links to the
 * transform's editor page. Multiple usages within the same transform
 * collapse to one row with a `usageCount`.
 */
export function TransformsTab({
  usages,
}: {
  usages: AttributeUsageInTransform[];
}) {
  const rows = aggregateUsages(usages);

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.transformId}
      rowHref={(r) =>
        `/sailpoint/transforms/${encodeURIComponent(r.transformId)}`
      }
      emptyState="No transforms reference this attribute."
      defaultSorting={[{ id: "usageCount", desc: true }]}
      mobileLayout="cards"
    />
  );
}
