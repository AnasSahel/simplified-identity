"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Check, Minus } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { groupTransformsByType } from "@simplified-identity/transforms";

import { TypeIcon } from "../../../_components/type-pill";
import { BulkActionBar } from "./bulk-action-bar";
import { RowActions } from "./row-actions";
import type { SelectableTransform } from "./types";

/**
 * Transforms table — grouped by transform `type` with sticky collapsible
 * group headers. Decisions locked by ADR
 * `vault/Projects/Simplified Identity/2026-05-14-transforms-list-grouping-by-type.md`
 * (supersedes the prefix-based grouping rejected at pixel review):
 *
 *   - Q1 group key = root `type` (`lookup`, `firstValid`, ...).
 *   - Q2 no cap — ISC exposes ~15-20 distinct types max.
 *   - Q3 collapsed state persisted in URL via `?groups.<type>=closed`.
 *   - Q4 the per-row Type column is hidden because the group header
 *     already names the type — repeating it on every row is pure noise.
 *
 * The grid view (`transforms-grid.tsx`) is intentionally NOT grouped —
 * grouping is table-only per the ADR.
 */

// select + name + usages + internal + actions. The Type column is
// hidden because the group header already names the type (Q4 of the
// ADR). Restore it (and bump this back to 6) if a "no grouping" toggle
// is added later.
const NUM_COLUMNS = 5;

/**
 * URL param names live in a single namespace prefix so they don't
 * collide with the page's other filter params (`type`, `origin`, ...).
 */
const URL_GROUP_PREFIX = "groups.";

function urlParamForGroup(type: string): string {
  return `${URL_GROUP_PREFIX}${type}`;
}

export function TransformsTable({
  data,
  tenantTransformNames,
}: {
  data: SelectableTransform[];
  /** Live list of all transform names in the tenant — fed to row-level
   * Duplicate so the dialog can pre-compute a unique default name. */
  tenantTransformNames: ReadonlyArray<string>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Grouping is recomputed on the visible (already-filtered) subset,
  // satisfying the "filter-aware: empty groups disappear" requirement.
  const groups = React.useMemo(() => groupTransformsByType(data), [data]);

  const closedSet = React.useMemo(() => {
    const out = new Set<string>();
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith(URL_GROUP_PREFIX) && value === "closed") {
        out.add(key.slice(URL_GROUP_PREFIX.length));
      }
    }
    return out;
  }, [searchParams]);

  const toggleGroupClosed = React.useCallback(
    (type: string, nextClosed: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const key = urlParamForGroup(type);
      if (nextClosed) {
        params.set(key, "closed");
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const selectHref = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("selected", id);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams],
  );

  // Selection — kept local; mirrors the DataTable's single-page contract
  // (selection scoped to what's currently rendered). Stored as a raw
  // Set; we intersect with the currently visible ids at render time so
  // a filter change implicitly drops orphans without an effect.
  const [rawSelectedIds, setRawSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const visibleIds = React.useMemo(
    () => new Set(data.map((d) => d.id)),
    [data],
  );

  const effectiveSelectedIds = React.useMemo(() => {
    const out = new Set<string>();
    for (const id of rawSelectedIds) {
      if (visibleIds.has(id)) out.add(id);
    }
    return out;
  }, [rawSelectedIds, visibleIds]);

  const toggleOne = React.useCallback((id: string, checked: boolean) => {
    setRawSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      setRawSelectedIds((prev) => {
        const next = new Set(prev);
        for (const t of data) {
          if (checked) next.add(t.id);
          else next.delete(t.id);
        }
        return next;
      });
    },
    [data],
  );

  const clearSelection = React.useCallback(
    () => setRawSelectedIds(new Set()),
    [],
  );

  const allVisibleSelected =
    data.length > 0 && data.every((d) => effectiveSelectedIds.has(d.id));
  const someVisibleSelected =
    !allVisibleSelected &&
    data.some((d) => effectiveSelectedIds.has(d.id));

  const selectedRows = React.useMemo(
    () => data.filter((d) => effectiveSelectedIds.has(d.id)),
    [data, effectiveSelectedIds],
  );

  return (
    <div className="space-y-2">
      {selectedRows.length > 0 ? (
        <BulkActionBar selected={selectedRows} onClear={clearSelection} />
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="si-micro w-10 py-2 uppercase tracking-wider text-muted-foreground">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all visible transforms"
                />
              </TableHead>
              <TableHead className="si-micro w-[55%] py-2 uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              {/* Type column intentionally omitted — the group header
                  already names the type, so the per-row column would be
                  pure repetition (Q4 of the type-grouping ADR). */}
              <TableHead className="si-micro w-20 py-2 text-right uppercase tracking-wider text-muted-foreground">
                Usages
              </TableHead>
              <TableHead className="si-micro py-2 text-center uppercase tracking-wider text-muted-foreground">
                Internal
              </TableHead>
              <TableHead className="si-micro w-10 py-2 uppercase tracking-wider text-muted-foreground" />
            </TableRow>
          </TableHeader>

          {groups.length === 0 ? (
            <tbody>
              <TableRow>
                <TableCell
                  colSpan={NUM_COLUMNS}
                  className="h-16 si-body text-center text-muted-foreground"
                >
                  No transforms in this view.
                </TableCell>
              </TableRow>
            </tbody>
          ) : (
            groups.map((group) => {
              const closed = closedSet.has(group.type);
              return (
                <tbody key={group.type}>
                  <GroupHeaderRow
                    type={group.type}
                    count={group.count}
                    closed={closed}
                    onToggle={(nextClosed) =>
                      toggleGroupClosed(group.type, nextClosed)
                    }
                  />
                  {!closed
                    ? group.transforms.map((t) => (
                        <TransformRow
                          key={t.id}
                          transform={t}
                          href={selectHref(t.id)}
                          selected={effectiveSelectedIds.has(t.id)}
                          onSelectedChange={(c) => toggleOne(t.id, c)}
                          onNavigate={() => router.push(selectHref(t.id))}
                          tenantTransformNames={tenantTransformNames}
                        />
                      ))
                    : null}
                </tbody>
              );
            })
          )}
        </Table>
      </div>
    </div>
  );
}

function GroupHeaderRow({
  type,
  count,
  closed,
  onToggle,
}: {
  type: string;
  count: number;
  closed: boolean;
  onToggle: (nextClosed: boolean) => void;
}) {
  // The "unknown" bucket is a defensive fallback for transforms with no
  // root `type` — render it neutrally to flag the abnormality without
  // dressing it up as a real ISC type.
  const isUnknown = type === "unknown";
  return (
    <tr
      // Sticky header — stays visible while scrolling within the group.
      // `top: 0` works against the nearest scroll ancestor; on this page
      // the document scrolls, so the header pins to the viewport top.
      className="sticky top-0 z-[5] bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border"
    >
      <td
        colSpan={NUM_COLUMNS}
        className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground"
      >
        <button
          type="button"
          onClick={() => onToggle(!closed)}
          aria-expanded={!closed}
          aria-controls={`group-${type}`}
          className="flex w-full items-center gap-2 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              closed && "-rotate-90",
            )}
            aria-hidden
          />
          {/* Type icon mirrors the per-row glyph used in the Name cell —
              same visual key whether the user scans the header or a
              row. */}
          <TypeIcon type={type} />
          <Pill
            tone={isUnknown ? "neutral" : "accent"}
            mono={!isUnknown}
            className="normal-case"
          >
            {type}
          </Pill>
          <span className="normal-case font-normal text-muted-foreground/80">
            · {count} {count === 1 ? "transform" : "transforms"}
          </span>
        </button>
      </td>
    </tr>
  );
}

function TransformRow({
  transform,
  href,
  selected,
  onSelectedChange,
  onNavigate,
  tenantTransformNames,
}: {
  transform: SelectableTransform;
  href: string;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onNavigate: () => void;
  tenantTransformNames: ReadonlyArray<string>;
}) {
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={cn(
        "cursor-pointer hover:bg-[var(--si-row-hover)]",
        selected && "bg-accent/40 hover:bg-accent/40",
      )}
      onClick={onNavigate}
    >
      <TableCell className="w-10 py-2">
        <span
          className="inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={onSelectedChange}
            aria-label={`Select ${transform.name}`}
          />
        </span>
      </TableCell>
      <TableCell className="w-[55%] py-2">
        <a
          href={href}
          onClick={(e) => e.preventDefault()}
          className="flex w-full items-center gap-2 font-mono si-caption"
        >
          <TypeIcon type={transform.type} />
          <span className="truncate">{transform.name}</span>
        </a>
      </TableCell>
      {/* Type cell intentionally omitted — covered by the group header. */}
      <TableCell className="w-20 py-2 text-right">
        {transform.usages === undefined ? (
          <span className="text-muted-foreground/40">—</span>
        ) : (
          <span
            className={cn(
              "font-mono tabular-nums si-caption",
              transform.usages === 0
                ? "text-muted-foreground/55"
                : "text-foreground",
            )}
          >
            {transform.usages}
          </span>
        )}
      </TableCell>
      <TableCell className="py-2 text-center">
        <span
          aria-label={transform.internal ? "Built-in" : "Custom"}
          title={transform.internal ? "Built-in" : "Custom"}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center",
            transform.internal
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground/50",
          )}
        >
          {transform.internal ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
        </span>
      </TableCell>
      <TableCell className="w-10 py-2">
        <span
          className="inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <RowActions
            id={transform.id}
            name={transform.name}
            usages={transform.usages}
            internal={transform.internal}
            tenantTransformNames={tenantTransformNames}
          />
        </span>
      </TableCell>
    </TableRow>
  );
}
