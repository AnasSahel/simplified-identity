"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";

import { TimestampCell } from "@/components/cells/timestamp-cell";
import { DataTable } from "@/components/ui/data-table";
import { Pill } from "@/components/ui/pill";

export type SourceAccountRow = {
  id: string;
  name: string | null;
  nativeIdentity: string | null;
  identityId: string | null;
  authoritative: boolean;
  disabled: boolean;
  locked: boolean;
  modified: string | null;
};

function AuthBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0 si-micro font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      AUTH
    </span>
  );
}

export function SourceAccountsTable({
  data,
  emptyState,
}: {
  data: SourceAccountRow[];
  /**
   * Override the default empty-state copy. Used when the page applies
   * filters that yield zero rows — the caller passes a message that
   * explains the filter is the cause, not an empty source.
   */
  emptyState?: React.ReactNode;
}) {
  const columns = React.useMemo<ColumnDef<SourceAccountRow, unknown>[]>(
    () => [
      {
        id: "account",
        accessorKey: "name",
        header: "Account",
        meta: { widthClass: "w-[28%]" },
        cell: ({ row }) => {
          const { name, nativeIdentity, authoritative } = row.original;
          const primary = name ?? nativeIdentity ?? row.original.id;
          const showSub = nativeIdentity && nativeIdentity !== primary;
          return (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="inline-flex items-center truncate si-body font-medium">
                {primary}
                {authoritative && <AuthBadge />}
              </span>
              {showSub && (
                <span className="truncate si-caption text-muted-foreground font-mono">
                  {nativeIdentity}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "identity",
        accessorKey: "identityId",
        header: "Identity",
        meta: { widthClass: "w-[24%]" },
        cell: ({ row }) => {
          const { identityId } = row.original;
          if (!identityId) {
            return (
              <Pill tone="warning" dot>
                Orphan
              </Pill>
            );
          }
          return (
            <Link
              href={`/sailpoint/identities/${encodeURIComponent(identityId)}`}
              className="si-caption font-mono text-primary hover:underline"
              // Stop the row-click handler in DataTable from firing — this
              // anchor has its own destination distinct from the row href.
              onClick={(e) => e.stopPropagation()}
            >
              {identityId}
            </Link>
          );
        },
      },
      {
        id: "state",
        header: "State",
        meta: { widthClass: "w-32" },
        cell: ({ row }) => {
          const { disabled, locked } = row.original;
          if (disabled && locked) {
            return (
              <Pill tone="danger" dot>
                Disabled · Locked
              </Pill>
            );
          }
          if (disabled) {
            return (
              <Pill tone="warning" dot>
                Disabled
              </Pill>
            );
          }
          if (locked) {
            return (
              <Pill tone="warning" dot>
                Locked
              </Pill>
            );
          }
          return (
            <Pill tone="success" dot>
              Active
            </Pill>
          );
        },
      },
      {
        id: "modified",
        accessorKey: "modified",
        header: "Updated",
        meta: { widthClass: "w-28" },
        cell: ({ row }) => <TimestampCell value={row.original.modified} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(r) => r.id}
      emptyState={emptyState ?? "No accounts on this source."}
    />
  );
}
