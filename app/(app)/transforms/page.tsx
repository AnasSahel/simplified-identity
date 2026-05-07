import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { PageHeader } from "../_components/page-header";
import { SailpointEmptyState } from "../_components/sailpoint-empty-state";
import { StatusDot } from "../_components/status-dot";
import { TypeIcon, TypePill } from "../_components/type-pill";
import { ViewTabs, type ViewTab } from "../_components/view-tabs";
import { PageActions } from "./_components/page-actions";
import { RowActions } from "./_components/row-actions";
import { TypeFilter } from "./_components/type-filter";

type SailpointTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  attributes?: Record<string, unknown>;
};

type View = "all" | "custom" | "internal";
const PAGE_SIZES = [10, 15, 25, 50] as const;
type PerPage = (typeof PAGE_SIZES)[number];
const DEFAULT_PER: PerPage = 15;

function viewFromParam(value: string | undefined): View {
  if (value === "custom" || value === "internal") return value;
  return "all";
}

function pageFromParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function perFromParam(value: string | undefined): PerPage {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n)
    ? (n as PerPage)
    : DEFAULT_PER;
}

function buildHref(
  view: View,
  page: number,
  per: PerPage,
  q: string,
  type: string | null,
): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (page > 1) params.set("page", String(page));
  if (per !== DEFAULT_PER) params.set("per", String(per));
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  const qs = params.toString();
  return qs ? `/transforms?${qs}` : "/transforms";
}

function pagesToRender(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function Toolbar({
  view,
  per,
  q,
  type,
  availableTypes,
}: {
  view: View;
  per: PerPage;
  q: string;
  type: string | null;
  availableTypes: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action="/transforms"
        method="get"
        className="relative flex-1 min-w-[16rem]"
        role="search"
      >
        {view !== "all" && <input type="hidden" name="view" value={view} />}
        {per !== DEFAULT_PER && (
          <input type="hidden" name="per" value={String(per)} />
        )}
        {type && <input type="hidden" name="type" value={type} />}
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or type…"
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 inline-flex h-5 -translate-y-1/2 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          /
        </kbd>
      </form>
      <TypeFilter availableTypes={availableTypes} selected={type} />
    </div>
  );
}

function TransformsTable({
  transforms,
  showInternal,
}: {
  transforms: SailpointTransform[];
  showInternal: boolean;
}) {
  const colCount = showInternal ? 4 : 3;
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[55%]">
              <span className="inline-flex items-center gap-1">
                Name
                <ArrowUp className="h-3 w-3 text-muted-foreground" aria-hidden />
              </span>
            </TableHead>
            <TableHead>Type</TableHead>
            {showInternal && (
              <TableHead className="text-center">Internal</TableHead>
            )}
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transforms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="h-16 text-center text-sm text-muted-foreground"
              >
                No transforms in this view.
              </TableCell>
            </TableRow>
          ) : (
            transforms.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="py-2">
                  <Link
                    href={`/transforms/${encodeURIComponent(t.id)}`}
                    className="flex w-full items-center gap-2 font-mono text-[13px] font-medium hover:underline"
                  >
                    <TypeIcon type={t.type} />
                    <span className="truncate">{t.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="py-2">
                  <TypePill type={t.type} />
                </TableCell>
                {showInternal && (
                  <TableCell className="py-2 text-center">
                    {t.internal ? (
                      <StatusDot tone="emerald">Yes</StatusDot>
                    ) : (
                      <StatusDot tone="neutral">No</StatusDot>
                    )}
                  </TableCell>
                )}
                <TableCell className="py-2 text-right">
                  <RowActions id={t.id} name={t.name} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Pagination({
  view,
  page,
  per,
  q,
  type,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
}: {
  view: View;
  page: number;
  per: PerPage;
  q: string;
  type: string | null;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
}) {
  if (total === 0) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const items = pagesToRender(page, totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2",
            )}
          >
            {per} / page
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PAGE_SIZES.map((n) => (
              <DropdownMenuItem key={n} asChild>
                <Link href={buildHref(view, 1, n, q, type)}>
                  {n} / page
                  {n === per && <Check className="ml-auto h-4 w-4" />}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          {prevDisabled ? (
            <Button variant="ghost" size="sm" disabled aria-disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only">Previous</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={buildHref(view, page - 1, per, q, type)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="sr-only">Previous</span>
              </Link>
            </Button>
          )}

          <div className="hidden items-center gap-1 sm:flex">
            {items.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  aria-hidden
                  className="px-2 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : item === page ? (
                <span
                  key={item}
                  aria-current="page"
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-sm font-medium text-background"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildHref(view, item, per, q, type)}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {item}
                </Link>
              ),
            )}
          </div>

          <span className="px-1 text-xs font-medium text-foreground sm:hidden">
            {page} / {totalPages}
          </span>

          {nextDisabled ? (
            <Button variant="ghost" size="sm" disabled aria-disabled>
              <span className="sr-only">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={buildHref(view, page + 1, per, q, type)}>
                <span className="sr-only">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default async function TransformsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    page?: string;
    per?: string;
    q?: string;
    type?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const activeView = viewFromParam(params.view);
  const per = perFromParam(params.per);
  const q = (params.q ?? "").trim();
  const typeFilter = (params.type ?? "").trim() || null;

  const result = await sailpointFetch<SailpointTransform[]>(
    session.user.id,
    "/v2025/transforms?limit=250",
  );

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <PageHeader
          title="Transforms"
          description="Identity transforms defined on the connected SailPoint tenant."
        />
        <div className="pt-6">
          <SailpointEmptyState
            reason={result.error.kind}
            detail={
              result.error.kind === "api_error"
                ? `${result.error.status} ${result.error.message}`
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  const all = [...result.data].sort((a, b) => a.name.localeCompare(b.name));
  const custom = all.filter((t) => !t.internal);
  const internal = all.filter((t) => t.internal);

  const tabs: ViewTab[] = [
    { key: "all", label: "All", count: all.length },
    { key: "custom", label: "Custom", count: custom.length },
    { key: "internal", label: "Built-in", count: internal.length },
  ];

  const byView =
    activeView === "custom"
      ? custom
      : activeView === "internal"
        ? internal
        : all;

  const availableTypes = Array.from(
    new Set(byView.map((t) => t.type)),
  ).sort();

  const byType = typeFilter
    ? byView.filter((t) => t.type === typeFilter)
    : byView;

  const needle = q.toLowerCase();
  const filtered = needle
    ? byType.filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          t.type.toLowerCase().includes(needle),
      )
    : byType;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const requestedPage = pageFromParam(params.page);
  const page = Math.min(requestedPage, totalPages);
  const visible = filtered.slice((page - 1) * per, page * per);
  const rangeStart = total === 0 ? 0 : (page - 1) * per + 1;
  const rangeEnd = Math.min(page * per, total);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <PageHeader
        title="Transforms"
        description="Identity transforms defined on the connected SailPoint tenant."
        actions={<PageActions />}
      />
      <div className="pt-4">
        <ViewTabs
          tabs={tabs}
          active={activeView}
          hrefFor={(key) => buildHref(key as View, 1, per, q, typeFilter)}
        />
      </div>
      <div className="space-y-3 pt-4">
        <Toolbar
          view={activeView}
          per={per}
          q={q}
          type={typeFilter}
          availableTypes={availableTypes}
        />
        <TransformsTable
          transforms={visible}
          showInternal={activeView === "all"}
        />
        <Pagination
          view={activeView}
          page={page}
          per={per}
          q={q}
          type={typeFilter}
          totalPages={totalPages}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </div>
    </div>
  );
}
