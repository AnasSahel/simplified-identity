"use client";

import * as React from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { LifecyclePill } from "./lifecycle-pill";

export type IdentityRow = {
  id: string;
  name: string;
  email: string | null;
  profileName: string | null;
  lifecycleState: string | null;
  manager: { id: string; name: string } | null;
  modified: string | null;
};

function formatModified(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  // Pinned to en-US so SSR and client agree (React hydration is strict on
  // text content). The rest of the product UI is English, so this matches
  // the surrounding copy too.
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const columns: ColumnDef<IdentityRow>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/identities/${encodeURIComponent(row.original.id)}`}
        className="flex flex-col leading-tight"
      >
        <span className="font-medium hover:underline">{row.original.name}</span>
        {row.original.email && (
          <span className="text-xs text-muted-foreground">
            {row.original.email}
          </span>
        )}
      </Link>
    ),
  },
  {
    id: "profile",
    accessorKey: "profileName",
    header: "Profile",
    cell: ({ row }) =>
      row.original.profileName ? (
        <span className="text-xs">{row.original.profileName}</span>
      ) : (
        <span className="text-xs text-muted-foreground/50">—</span>
      ),
  },
  {
    id: "lifecycle",
    accessorKey: "lifecycleState",
    header: "Lifecycle",
    cell: ({ row }) => <LifecyclePill state={row.original.lifecycleState} />,
  },
  {
    id: "manager",
    accessorKey: "manager",
    header: "Manager",
    cell: ({ row }) =>
      row.original.manager ? (
        <Link
          href={`/identities/${encodeURIComponent(row.original.manager.id)}`}
          className="text-xs hover:underline"
        >
          {row.original.manager.name}
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground/50">—</span>
      ),
  },
  {
    id: "modified",
    accessorKey: "modified",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatModified(row.original.modified)}
      </span>
    ),
  },
];

export function IdentitiesTable({ data }: { data: IdentityRow[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
              {hg.headers.map((header) => {
                const widthClass =
                  header.id === "name"
                    ? "w-[35%]"
                    : header.id === "modified"
                      ? "w-28"
                      : header.id === "lifecycle"
                        ? "w-32"
                        : "";
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                      widthClass,
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
                className="h-16 text-center text-sm text-muted-foreground"
              >
                No identities match these filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
