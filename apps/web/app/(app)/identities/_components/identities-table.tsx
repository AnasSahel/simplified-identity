"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { RowActions } from "@/components/ui/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { AvatarInitials } from "./avatar-initials";
import { BulkProcessButton } from "./bulk-process-button";
import { ExportCsvButton } from "./export-csv-button";
import { processIdentityAction } from "./identity-actions";
import { LifecyclePill } from "./lifecycle-pill";
import { RiskPill } from "./risk-pill";

export type IdentityRow = {
  id: string;
  name: string;
  email: string | null;
  profileName: string | null;
  lifecycleState: string | null;
  manager: { id: string; name: string } | null;
  modified: string | null;
  department: string | null;
  jobTitle: string | null;
  riskScore: string | null;
  accountCount: number;
  entitlementCount: number;
  isExternal: boolean;
};

const RTF = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
const DTF = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatRelative(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = d.getTime() - Date.now();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return RTF.format(days, "day");
  return DTF.format(d);
}

function ExtBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      EXT
    </span>
  );
}

function RowMenu({ row }: { row: IdentityRow }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onProcess() {
    startTransition(async () => {
      await processIdentityAction(row.id);
      router.refresh();
    });
  }

  return (
    <RowActions
      label={`Actions for ${row.name}`}
      header={row.name}
      items={[
        {
          label: "View detail",
          href: `/identities/${encodeURIComponent(row.id)}`,
        },
        {
          label: "Process this identity",
          icon: <RefreshCw className="h-3.5 w-3.5" />,
          onSelect: onProcess,
          pending,
        },
        {
          label: "Copy identity id",
          onSelect: () => navigator.clipboard?.writeText(row.id),
        },
      ]}
    />
  );
}

export function IdentitiesTable({
  data,
  riskAvailable,
}: {
  data: IdentityRow[];
  /**
   * Whether to render the Risk column. When false, the column is omitted
   * entirely — no "n/a" placeholder. Driven by the page-level check
   * (any identity exposes `identityRiskScore`).
   */
  riskAvailable: boolean;
}) {
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});

  const columns = React.useMemo<ColumnDef<IdentityRow>[]>(() => {
    const cols: ColumnDef<IdentityRow>[] = [
      {
        id: "select",
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
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(v) => row.toggleSelected(v)}
            aria-label={`Select ${row.original.name}`}
          />
        ),
        enableSorting: false,
      },
      {
        id: "identity",
        accessorKey: "name",
        header: "Identity",
        cell: ({ row }) => (
          <Link
            href={`/identities/${encodeURIComponent(row.original.id)}`}
            className="flex items-center gap-2.5 leading-tight"
          >
            <AvatarInitials name={row.original.name} />
            <div className="flex min-w-0 flex-col">
              <span className="inline-flex items-center truncate font-medium hover:underline">
                {row.original.name}
                {row.original.isExternal && <ExtBadge />}
              </span>
              {row.original.email && (
                <span className="truncate text-xs text-muted-foreground">
                  {row.original.email}
                </span>
              )}
            </div>
          </Link>
        ),
      },
      {
        id: "department",
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => {
          const { department, jobTitle } = row.original;
          if (!department && !jobTitle) {
            return <span className="text-xs text-muted-foreground/50">—</span>;
          }
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-sm">{department ?? "—"}</span>
              {jobTitle && (
                <span className="text-xs text-muted-foreground">
                  {jobTitle}
                </span>
              )}
            </div>
          );
        },
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
        id: "lifecycle",
        accessorKey: "lifecycleState",
        header: "Status",
        cell: ({ row }) => <LifecyclePill state={row.original.lifecycleState} />,
      },
    ];

    if (riskAvailable) {
      cols.push({
        id: "risk",
        accessorKey: "riskScore",
        header: "Risk",
        cell: ({ row }) => <RiskPill value={row.original.riskScore} />,
      });
    }

    cols.push(
      {
        id: "accounts",
        accessorKey: "accountCount",
        header: "Accts",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {row.original.accountCount}
          </span>
        ),
      },
      {
        id: "entitlements",
        accessorKey: "entitlementCount",
        header: "Entl",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {row.original.entitlementCount}
          </span>
        ),
      },
      {
        id: "modified",
        accessorKey: "modified",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatRelative(row.original.modified)}
          </span>
        ),
      },
      {
        id: "menu",
        header: () => null,
        cell: ({ row }) => <RowMenu row={row.original} />,
        enableSorting: false,
      },
    );

    return cols;
  }, [riskAvailable]);

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `${data.length} on this page`}
        </p>
        <div className="flex items-center gap-2">
          <ExportCsvButton rows={data} />
          <BulkProcessButton
            selectedIds={selectedIds}
            onProcessed={() => setRowSelection({})}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((header) => {
                  const widthClass =
                    header.id === "select"
                      ? "w-10"
                      : header.id === "identity"
                        ? "w-[28%]"
                        : header.id === "department"
                          ? "w-[18%]"
                          : header.id === "lifecycle"
                            ? "w-28"
                            : header.id === "risk"
                              ? "w-24"
                              : header.id === "accounts" ||
                                  header.id === "entitlements"
                                ? "w-16 text-right"
                                : header.id === "modified"
                                  ? "w-28"
                                  : header.id === "menu"
                                    ? "w-10"
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    row.getIsSelected() && "bg-accent/40 hover:bg-accent/40",
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const alignRight =
                      cell.column.id === "accounts" ||
                      cell.column.id === "entitlements";
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn("py-2", alignRight && "text-right")}
                      >
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
