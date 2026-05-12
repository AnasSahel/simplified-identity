"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { PrincipalCell } from "@/components/cells/principal-cell";
import { TimestampCell } from "@/components/cells/timestamp-cell";
import { RowActions } from "@/components/ui/row-actions";

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

function ExtBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0 si-micro font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      EXT
    </span>
  );
}

function IdentityRowActions({ row }: { row: IdentityRow }) {
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
          href: `/sailpoint/identities/${encodeURIComponent(row.id)}`,
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
  const columns = React.useMemo<ColumnDef<IdentityRow, unknown>[]>(() => {
    const cols: ColumnDef<IdentityRow, unknown>[] = [
      {
        id: "identity",
        accessorKey: "name",
        header: "Identity",
        meta: { widthClass: "w-[28%]" },
        cell: ({ row }) => (
          <PrincipalCell
            name={row.original.name}
            email={row.original.email}
            leading={<AvatarInitials name={row.original.name} />}
            trailing={row.original.isExternal ? <ExtBadge /> : null}
          />
        ),
      },
      {
        id: "department",
        accessorKey: "department",
        header: "Department",
        meta: { widthClass: "w-[18%]" },
        cell: ({ row }) => {
          const { department, jobTitle } = row.original;
          if (!department && !jobTitle) {
            return (
              <span className="si-caption text-muted-foreground/50">—</span>
            );
          }
          return (
            <div className="flex flex-col leading-tight">
              <span className="si-body">{department ?? "—"}</span>
              {jobTitle && (
                <span className="si-caption text-muted-foreground">
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
            <span className="si-caption">{row.original.manager.name}</span>
          ) : (
            <span className="si-caption text-muted-foreground/50">—</span>
          ),
      },
      {
        id: "lifecycle",
        accessorKey: "lifecycleState",
        header: "Status",
        meta: { widthClass: "w-28" },
        cell: ({ row }) => (
          <LifecyclePill state={row.original.lifecycleState} />
        ),
      },
    ];

    if (riskAvailable) {
      cols.push({
        id: "risk",
        accessorKey: "riskScore",
        header: "Risk",
        meta: { widthClass: "w-24" },
        cell: ({ row }) => <RiskPill value={row.original.riskScore} />,
      });
    }

    cols.push(
      {
        id: "accounts",
        accessorKey: "accountCount",
        header: "Accts",
        meta: { widthClass: "w-16", align: "right" },
        cell: ({ row }) => (
          <span className="si-caption font-mono tabular-nums">
            {row.original.accountCount}
          </span>
        ),
      },
      {
        id: "entitlements",
        accessorKey: "entitlementCount",
        header: "Entl",
        meta: { widthClass: "w-16", align: "right" },
        cell: ({ row }) => (
          <span className="si-caption font-mono tabular-nums">
            {row.original.entitlementCount}
          </span>
        ),
      },
      {
        id: "modified",
        accessorKey: "modified",
        header: "Updated",
        meta: { widthClass: "w-28" },
        cell: ({ row }) => <TimestampCell value={row.original.modified} />,
      },
    );

    return cols;
  }, [riskAvailable]);

  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(r) => r.id}
      selection
      rowHref={(r) => `/sailpoint/identities/${encodeURIComponent(r.id)}`}
      rowActions={(r) => <IdentityRowActions row={r} />}
      toolbar={({ selectedIds, total, clearSelection }) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="si-caption text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : `${total} on this page`}
          </p>
          <div className="flex items-center gap-2">
            <ExportCsvButton rows={data} />
            <BulkProcessButton
              selectedIds={selectedIds}
              onProcessed={clearSelection}
            />
          </div>
        </div>
      )}
      emptyState="No identities match these filters."
    />
  );
}
