"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export type IdentityAttributeRow = {
  name: string;
  displayName: string;
  type: string | null;
  multi: boolean;
  searchable: boolean;
  standard: boolean;
  sourcesCount: number;
};

function YesNoPill({ value }: { value: boolean }) {
  return (
    <Pill tone={value ? "success" : "neutral"} shape="square">
      {value ? "Yes" : "No"}
    </Pill>
  );
}

function StandardPill({ standard }: { standard: boolean }) {
  return (
    <Pill tone={standard ? "accent" : "neutral"} shape="square">
      {standard ? "Standard" : "Custom"}
    </Pill>
  );
}

function TypePill({ type }: { type: string | null }) {
  if (!type) {
    return <span className="si-caption text-muted-foreground/50">—</span>;
  }
  return (
    <Pill tone="info" mono shape="square">
      {type}
    </Pill>
  );
}

export function IdentityAttributesTable({
  data,
}: {
  data: IdentityAttributeRow[];
}) {
  const columns = React.useMemo<ColumnDef<IdentityAttributeRow, unknown>[]>(
    () => [
      {
        id: "displayName",
        accessorKey: "displayName",
        header: "Display name",
        meta: { widthClass: "w-[26%]" },
        cell: ({ row }) => (
          <Link
            href={`/sailpoint/identity-attributes/${encodeURIComponent(
              row.original.name,
            )}`}
            className="si-body font-medium text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.displayName}
          </Link>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Technical name",
        meta: { widthClass: "w-[22%]" },
        cell: ({ row }) => (
          <span className="si-caption font-mono text-muted-foreground">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        meta: { widthClass: "w-24" },
        cell: ({ row }) => <TypePill type={row.original.type} />,
      },
      {
        id: "multi",
        accessorKey: "multi",
        header: "Multi-valued",
        meta: { widthClass: "w-28", mobileHidden: true },
        cell: ({ row }) => <YesNoPill value={row.original.multi} />,
        sortingFn: (a, b) =>
          Number(a.original.multi) - Number(b.original.multi),
      },
      {
        id: "searchable",
        accessorKey: "searchable",
        header: "Searchable",
        meta: { widthClass: "w-28", mobileHidden: true },
        cell: ({ row }) => <YesNoPill value={row.original.searchable} />,
        sortingFn: (a, b) =>
          Number(a.original.searchable) - Number(b.original.searchable),
      },
      {
        id: "standard",
        accessorKey: "standard",
        header: "Origin",
        meta: { widthClass: "w-24" },
        cell: ({ row }) => <StandardPill standard={row.original.standard} />,
        sortingFn: (a, b) =>
          Number(a.original.standard) - Number(b.original.standard),
      },
      {
        id: "sourcesCount",
        accessorKey: "sourcesCount",
        header: "Sources",
        meta: { widthClass: "w-20", align: "right", mobileHidden: true },
        cell: ({ row }) => (
          <span
            className={cn(
              "si-caption font-mono tabular-nums",
              row.original.sourcesCount === 0
                ? "text-muted-foreground/55"
                : "text-foreground",
            )}
          >
            {row.original.sourcesCount}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(r) => r.name}
      mobileLayout="cards"
      defaultSorting={[{ id: "displayName", desc: false }]}
      rowHref={(r) =>
        `/sailpoint/identity-attributes/${encodeURIComponent(r.name)}`
      }
      emptyState="No identity attributes match these filters."
    />
  );
}
