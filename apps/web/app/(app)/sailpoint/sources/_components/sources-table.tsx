"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { PrincipalCell } from "@/components/cells/principal-cell";
import { TimestampCell } from "@/components/cells/timestamp-cell";
import { DataTable } from "@/components/ui/data-table";
import { Pill } from "@/components/ui/pill";

import { SourceStatusPill } from "./source-status-pill";

export type SourceRow = {
  id: string;
  name: string;
  description: string | null;
  connector: string | null;
  connectorName: string | null;
  authoritative: boolean;
  healthy?: boolean;
  status: string | null;
  since: string | null;
  owner: { id: string; name: string } | null;
  accountCount: number | null;
};

function AuthBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0 si-micro font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      AUTH
    </span>
  );
}

export function SourcesTable({ data }: { data: SourceRow[] }) {
  const columns = React.useMemo<ColumnDef<SourceRow, unknown>[]>(
    () => [
      {
        id: "source",
        accessorKey: "name",
        header: "Source",
        meta: { widthClass: "w-[30%]" },
        cell: ({ row }) => (
          <PrincipalCell
            name={row.original.name}
            email={row.original.description}
            trailing={row.original.authoritative ? <AuthBadge /> : null}
          />
        ),
      },
      {
        id: "connector",
        accessorKey: "connectorName",
        header: "Connector",
        meta: { widthClass: "w-[16%]" },
        cell: ({ row }) => {
          const label =
            row.original.connectorName ?? row.original.connector ?? null;
          if (!label) {
            return (
              <span className="si-caption text-muted-foreground/50">—</span>
            );
          }
          return <Pill tone="neutral">{label}</Pill>;
        },
      },
      {
        id: "status",
        accessorKey: "healthy",
        header: "Status",
        meta: { widthClass: "w-28" },
        cell: ({ row }) => (
          <SourceStatusPill
            healthy={row.original.healthy}
            status={row.original.status}
          />
        ),
      },
      {
        id: "since",
        accessorKey: "since",
        header: "Last aggregated",
        meta: { widthClass: "w-32" },
        cell: ({ row }) => <TimestampCell value={row.original.since} />,
      },
      {
        id: "accounts",
        accessorKey: "accountCount",
        header: "Accts",
        meta: { widthClass: "w-16", align: "right" },
        cell: ({ row }) => {
          const n = row.original.accountCount;
          if (n === null) {
            return (
              <span className="si-caption text-muted-foreground/50">—</span>
            );
          }
          return (
            <span className="si-caption font-mono tabular-nums">{n}</span>
          );
        },
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "Owner",
        meta: { widthClass: "w-[18%]" },
        cell: ({ row }) =>
          row.original.owner ? (
            <span className="si-caption">{row.original.owner.name}</span>
          ) : (
            <span className="si-caption text-muted-foreground/50">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(r) => r.id}
      rowHref={(r) => `/sailpoint/sources/${encodeURIComponent(r.id)}`}
      emptyState="No sources match these filters."
    />
  );
}
