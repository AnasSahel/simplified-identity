"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

/**
 * `<DataTable>` — the single table primitive for list views.
 * See DESIGN.md §2.3.
 *
 * Owns: header chrome, sort icons (when sorting is enabled by the
 * consumer's columns), row hover, row selection state, clickable rows,
 * standard empty state. Density toggle is per-call-site.
 *
 * Column-level styling overrides go through TanStack's `meta`:
 *   ```ts
 *   { id: "accounts", header: "Accts", meta: { align: "right", widthClass: "w-16" }, ... }
 *   ```
 *
 * Cellule clic interactif (checkbox, kebab) doit `e.stopPropagation()`
 * pour ne pas déclencher rowHref. Le primitive le fait pour les colonnes
 * automatiques (_select, _actions) ; à toi de le faire dans les
 * `cell:` user-fournis qui contiennent des contrôles cliquables.
 */

export type ColumnMeta = {
  align?: "left" | "right";
  widthClass?: string;
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
    widthClass?: string;
  }
}

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  rowKey: (row: T) => string;
  density?: "dense" | "comfortable";
  /** Makes rows clickable — clicking anywhere on the row (other than
   * checkbox / kebab) navigates here. */
  rowHref?: (row: T) => string;
  /** Renders a trailing actions cell (e.g. `<RowActions>`). */
  rowActions?: (row: T) => React.ReactNode;
  /** Adds a leading checkbox column and tracks row selection internally. */
  selection?: boolean;
  /** Render slot above the table. Receives selection info to render
   * "N selected" / Process / Export. */
  toolbar?: (ctx: ToolbarCtx) => React.ReactNode;
  /** Body content when `data` is empty. */
  emptyState?: React.ReactNode;
  className?: string;
};

export type ToolbarCtx = {
  selectedIds: string[];
  total: number;
  clearSelection: () => void;
};

export function DataTable<T>({
  data,
  columns: userColumns,
  rowKey,
  density = "dense",
  rowHref,
  rowActions,
  selection = false,
  toolbar,
  emptyState,
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});

  const columns = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    const cols: ColumnDef<T, unknown>[] = [];
    if (selection) {
      cols.push({
        id: "_select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={
              table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
            }
            onChange={(v) => table.toggleAllRowsSelected(v)}
            aria-label="Select all on page"
          />
        ),
        cell: ({ row }) => (
          <span
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <Checkbox
              checked={row.getIsSelected()}
              onChange={(v) => row.toggleSelected(v)}
              aria-label="Select row"
            />
          </span>
        ),
        enableSorting: false,
        meta: { widthClass: "w-10" },
      });
    }
    cols.push(...userColumns);
    if (rowActions) {
      cols.push({
        id: "_actions",
        header: () => null,
        cell: ({ row }) => (
          <span
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            {rowActions(row.original)}
          </span>
        ),
        enableSorting: false,
        meta: { widthClass: "w-10" },
      });
    }
    return cols;
  }, [userColumns, selection, rowActions]);

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: selection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: rowKey,
  });

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const clearSelection = React.useCallback(() => setRowSelection({}), []);

  const cellPad = density === "dense" ? "py-2" : "py-3";

  return (
    <div className={cn("space-y-2", className)}>
      {toolbar
        ? toolbar({ selectedIds, total: data.length, clearSelection })
        : null}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | ColumnMeta
                    | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "si-micro py-2 uppercase tracking-wider text-muted-foreground",
                        meta?.align === "right" && "text-right",
                        meta?.widthClass,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
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
                  className="h-16 si-body text-center text-muted-foreground"
                >
                  {emptyState ?? "No results."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <DataRow
                  key={row.id}
                  row={row}
                  rowHref={rowHref}
                  cellPad={cellPad}
                  onNavigate={(href) => router.push(href)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DataRow<T>({
  row,
  rowHref,
  cellPad,
  onNavigate,
}: {
  row: Row<T>;
  rowHref?: (row: T) => string;
  cellPad: string;
  onNavigate: (href: string) => void;
}) {
  const href = rowHref?.(row.original);
  return (
    <TableRow
      data-state={row.getIsSelected() ? "selected" : undefined}
      className={cn(
        row.getIsSelected() && "bg-accent/40 hover:bg-accent/40",
        href &&
          "cursor-pointer hover:bg-[var(--si-row-hover)]",
      )}
      onClick={href ? () => onNavigate(href) : undefined}
    >
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
        return (
          <TableCell
            key={cell.id}
            className={cn(
              cellPad,
              meta?.align === "right" && "text-right",
              meta?.widthClass,
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
