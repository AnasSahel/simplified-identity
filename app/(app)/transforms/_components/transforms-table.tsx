"use client";

import * as React from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { TypeIcon, TypePill } from "../../_components/type-pill";
import { BulkActionBar } from "./bulk-action-bar";
import { RowActions } from "./row-actions";
import type { SelectableTransform } from "./types";

const columns: ColumnDef<SelectableTransform>[] = [
  {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onChange={(value) => table.toggleAllPageRowsSelected(value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.name}`}
        checked={row.getIsSelected()}
        onChange={(value) => row.toggleSelected(value)}
      />
    ),
    size: 32,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/transforms/${encodeURIComponent(row.original.id)}`}
        className="flex w-full items-center gap-2 font-mono text-xs font-medium hover:underline"
      >
        <TypeIcon type={row.original.type} />
        <span className="truncate">{row.original.name}</span>
      </Link>
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
    cell: ({ row }) => {
      const v = row.original.usages;
      if (v === undefined) {
        return (
          <span className="block text-right text-muted-foreground/40">—</span>
        );
      }
      return (
        <span
          className={cn(
            "block text-right font-mono tabular-nums text-xs",
            v === 0 ? "text-muted-foreground/55" : "text-foreground",
          )}
        >
          {v}
        </span>
      );
    },
    sortingFn: (a, b) => (a.original.usages ?? 0) - (b.original.usages ?? 0),
  },
  {
    id: "internal",
    accessorKey: "internal",
    header: "Internal",
    cell: ({ row }) => {
      const v = row.original.internal;
      return (
        <div className="flex justify-center">
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
        </div>
      );
    },
    sortingFn: (a, b) =>
      Number(!!a.original.internal) - Number(!!b.original.internal),
  },
  {
    id: "actions",
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <RowActions id={row.original.id} name={row.original.name} />
      </div>
    ),
    size: 40,
  },
];

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc")
    return <ArrowUp className="h-3 w-3" aria-hidden />;
  if (direction === "desc")
    return <ArrowDown className="h-3 w-3" aria-hidden />;
  return (
    <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" aria-hidden />
  );
}

export function TransformsTable({ data }: { data: SelectableTransform[] }) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection, sorting },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original);

  return (
    <div className="space-y-2">
      {selectedRows.length > 0 && (
        <BulkActionBar
          selected={selectedRows}
          onClear={() => setRowSelection({})}
        />
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  const widthClass =
                    header.id === "select"
                      ? "w-8 px-3"
                      : header.id === "actions"
                        ? "w-12 text-right"
                        : header.id === "name"
                          ? "w-[55%]"
                          : header.id === "internal"
                            ? "text-center"
                            : header.id === "usages"
                              ? "w-20 text-right"
                              : "";
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                        widthClass,
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="group inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-foreground"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <SortIcon direction={dir} />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-16 text-center text-sm text-muted-foreground"
                >
                  No transforms in this view.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const padClass =
                      cell.column.id === "select"
                        ? "px-3 py-1.5"
                        : cell.column.id === "actions"
                          ? "py-1.5 text-right"
                          : "py-1.5";
                    return (
                      <TableCell key={cell.id} className={padClass}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
