"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

import { AvatarInitials } from "../../identities/_components/avatar-initials";

const NUMBER_FMT = new Intl.NumberFormat("en-US");

/**
 * Row contract for the identity-attributes list.
 *
 * `unused`, `drift` and `driftPercent` are display-only signals scaffolded
 * for v1 — the data backing them lands via #206 (Unused detection) and
 * #207 (Drift detection). Until then, rows never trigger the signals, and
 * the cells degrade silently. Filters that target these signals are
 * present but rendered disabled (see `unused-filter.tsx` / `drift-filter.tsx`).
 */
export type IdentityAttributeRow = {
  /** Tenant-side identifier — surfaced (truncated) on the row for support. */
  id: string;
  name: string;
  displayName: string;
  type: string | null;
  searchable: boolean;
  standard: boolean;
  identityProfilesCount: number;
  transformsCount: number;
  /**
   * Usage snapshot (#206): `true` when no identity profile maps this
   * attribute AND no transform reads it as an `identityAttribute` source.
   * Triggers the orange "Unused" pill + warning row accent.
   */
  unused?: boolean;
  /** Drift signal (#207, not wired yet). */
  drift?: boolean;
  /** 0–100 — null-rate across identities. Surfaced only when `drift === true`. */
  driftPercent?: number;
};

function YesNoPill({ value }: { value: boolean }) {
  return (
    <Pill tone={value ? "success" : "neutral"} shape="square">
      {value ? "Yes" : "No"}
    </Pill>
  );
}

function OriginPill({ standard }: { standard: boolean }) {
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

function abbreviateId(id: string): string | null {
  if (!id) return null;
  if (id.length <= 12) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/**
 * 4px left accent — warning tint for unused, danger tint for drift.
 * Rendered as an absolutely-positioned bar inside the first cell since the
 * `<DataTable>` primitive doesn't expose a per-row className. Drift wins
 * over unused when both are set (drift is the harder signal).
 */
function RowAccent({ unused, drift }: { unused?: boolean; drift?: boolean }) {
  if (!unused && !drift) return null;
  const tint = drift ? "bg-rose-500" : "bg-amber-500";
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-0 top-0 h-full w-1",
        tint,
      )}
    />
  );
}

function AttributeCell({ row }: { row: IdentityAttributeRow }) {
  const idAbbrev = abbreviateId(row.id);
  return (
    <div className="relative flex items-center gap-3 pl-3">
      <RowAccent unused={row.unused} drift={row.drift} />
      <AvatarInitials name={row.displayName} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="inline-flex items-center gap-2">
          <Link
            href={`/sailpoint/identity-attributes/${encodeURIComponent(row.name)}`}
            className="truncate si-body font-medium text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.displayName}
          </Link>
          {row.drift ? (
            <Pill tone="danger" shape="square">
              Drift
            </Pill>
          ) : row.unused ? (
            <Pill tone="warning" shape="square">
              Unused
            </Pill>
          ) : null}
        </span>
        {row.drift && typeof row.driftPercent === "number" ? (
          <span className="si-caption text-rose-700 dark:text-rose-300">
            null on {row.driftPercent}% of identities
          </span>
        ) : null}
        <span className="truncate si-caption font-mono text-muted-foreground">
          {row.name}
          {idAbbrev ? (
            <span className="ml-2 text-muted-foreground/60">ID {idAbbrev}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function CountCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "si-body font-mono tabular-nums",
        value === 0 ? "text-muted-foreground/55" : "text-foreground",
      )}
    >
      {NUMBER_FMT.format(value)}
    </span>
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
        header: "Attribute",
        meta: { widthClass: "w-[34%]" },
        cell: ({ row }) => <AttributeCell row={row.original} />,
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        meta: { widthClass: "w-24" },
        cell: ({ row }) => <TypePill type={row.original.type} />,
      },
      {
        id: "standard",
        accessorKey: "standard",
        header: "Origin",
        meta: { widthClass: "w-24" },
        cell: ({ row }) => <OriginPill standard={row.original.standard} />,
        sortingFn: (a, b) =>
          Number(a.original.standard) - Number(b.original.standard),
      },
      {
        id: "identityProfilesCount",
        accessorKey: "identityProfilesCount",
        header: "Profiles",
        meta: { widthClass: "w-20", align: "right", mobileHidden: true },
        cell: ({ row }) => (
          <CountCell value={row.original.identityProfilesCount} />
        ),
      },
      {
        id: "transformsCount",
        accessorKey: "transformsCount",
        header: "Transforms",
        meta: { widthClass: "w-24", align: "right", mobileHidden: true },
        cell: ({ row }) => <CountCell value={row.original.transformsCount} />,
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
