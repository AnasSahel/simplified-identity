import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
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
import { TypeIcon, TypePill } from "../_components/type-pill";
import { InternalFilter, type InternalFilterValue } from "./_components/internal-filter";
import { LayoutToggle, type Layout } from "./_components/layout-toggle";
import { PageActions } from "./_components/page-actions";
import { RowActions } from "./_components/row-actions";
import { TransformsGrid } from "./_components/transforms-grid";
import { TypeFilter } from "./_components/type-filter";

type SailpointTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  attributes?: Record<string, unknown>;
};

const PAGE_SIZES = [10, 15, 25, 50] as const;
type PerPage = (typeof PAGE_SIZES)[number];
const DEFAULT_PER: PerPage = 25;

function internalFromParam(value: string | undefined): InternalFilterValue {
  if (value === "custom" || value === "builtin") return value;
  return "all";
}

function layoutFromParam(value: string | undefined): Layout {
  return value === "grid" ? "grid" : "table";
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

function buildHref(opts: {
  page?: number;
  per?: PerPage;
  q?: string;
  type?: string | null;
  internal?: InternalFilterValue;
  layout?: Layout;
}): string {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.per && opts.per !== DEFAULT_PER) params.set("per", String(opts.per));
  if (opts.q) params.set("q", opts.q);
  if (opts.type) params.set("type", opts.type);
  if (opts.internal && opts.internal !== "all")
    params.set("internal", opts.internal);
  if (opts.layout && opts.layout !== "table") params.set("layout", opts.layout);
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
  per,
  q,
  type,
  internal,
  layout,
  availableTypes,
}: {
  per: PerPage;
  q: string;
  type: string | null;
  internal: InternalFilterValue;
  layout: Layout;
  availableTypes: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action="/transforms"
        method="get"
        className="relative min-w-[16rem] flex-1"
        role="search"
      >
        {per !== DEFAULT_PER && (
          <input type="hidden" name="per" value={String(per)} />
        )}
        {type && <input type="hidden" name="type" value={type} />}
        {internal !== "all" && (
          <input type="hidden" name="internal" value={internal} />
        )}
        {layout !== "table" && (
          <input type="hidden" name="layout" value={layout} />
        )}
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
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 inline-flex h-5 -translate-y-1/2 select-none items-center rounded border border-border bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground">
          /
        </kbd>
      </form>
      <TypeFilter availableTypes={availableTypes} selected={type} />
      <InternalFilter selected={internal} />
      <div className="ml-auto">
        <LayoutToggle
          layout={layout}
          hrefFor={(l) =>
            buildHref({ per, q, type, internal, layout: l })
          }
        />
      </div>
    </div>
  );
}

function InternalCell({ internal }: { internal: boolean | undefined }) {
  return (
    <span
      aria-label={internal ? "Built-in" : "Custom"}
      title={internal ? "Built-in" : "Custom"}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center",
        internal
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground/50",
      )}
    >
      {internal ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Minus className="h-3.5 w-3.5" />
      )}
    </span>
  );
}

function TransformsTable({ transforms }: { transforms: SailpointTransform[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-8 px-3">
              <input
                type="checkbox"
                aria-label="Select all"
                className="h-3.5 w-3.5 cursor-pointer rounded border-input"
              />
            </TableHead>
            <TableHead className="w-[60%] py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                Name
                <ArrowUp
                  className="h-3 w-3 text-muted-foreground"
                  aria-hidden
                />
              </span>
            </TableHead>
            <TableHead className="py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Internal
            </TableHead>
            <TableHead className="w-12 py-2 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transforms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-16 text-center text-sm text-muted-foreground"
              >
                No transforms in this view.
              </TableCell>
            </TableRow>
          ) : (
            transforms.map((t) => (
              <TableRow key={t.id} className="group">
                <TableCell className="px-3 py-1.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${t.name}`}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-input"
                  />
                </TableCell>
                <TableCell className="py-1.5">
                  <Link
                    href={`/transforms/${encodeURIComponent(t.id)}`}
                    className="flex w-full items-center gap-2 font-mono text-xs font-medium hover:underline"
                  >
                    <TypeIcon type={t.type} />
                    <span className="truncate">{t.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="py-1.5">
                  <TypePill type={t.type} />
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  <div className="inline-flex justify-center">
                    <InternalCell internal={t.internal} />
                  </div>
                </TableCell>
                <TableCell className="py-1.5 text-right">
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
  page,
  per,
  q,
  type,
  internal,
  layout,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
}: {
  page: number;
  per: PerPage;
  q: string;
  type: string | null;
  internal: InternalFilterValue;
  layout: Layout;
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
                <Link
                  href={buildHref({ page: 1, per: n, q, type, internal, layout })}
                >
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
              <Link
                href={buildHref({
                  page: page - 1,
                  per,
                  q,
                  type,
                  internal,
                  layout,
                })}
              >
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
                  href={buildHref({
                    page: item,
                    per,
                    q,
                    type,
                    internal,
                    layout,
                  })}
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
              <Link
                href={buildHref({
                  page: page + 1,
                  per,
                  q,
                  type,
                  internal,
                  layout,
                })}
              >
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
    page?: string;
    per?: string;
    q?: string;
    type?: string;
    internal?: string;
    layout?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const per = perFromParam(params.per);
  const q = (params.q ?? "").trim();
  const typeFilter = (params.type ?? "").trim() || null;
  const internalFilter = internalFromParam(params.internal);
  const layout = layoutFromParam(params.layout);

  const result = await sailpointFetch<SailpointTransform[]>(
    session.user.id,
    "/v2025/transforms?limit=250",
  );

  if (!result.ok) {
    return (
      <div className="w-full px-6 py-6">
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

  const byInternal =
    internalFilter === "custom"
      ? all.filter((t) => !t.internal)
      : internalFilter === "builtin"
        ? all.filter((t) => t.internal)
        : all;

  const availableTypes = Array.from(
    new Set(byInternal.map((t) => t.type)),
  ).sort();

  const byType = typeFilter
    ? byInternal.filter((t) => t.type === typeFilter)
    : byInternal;

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
    <div className="w-full px-6 py-6">
      <PageHeader
        title="Transforms"
        description="Identity transforms defined on the connected SailPoint tenant."
        actions={<PageActions />}
      />
      <div className="space-y-3 pt-4">
        <Toolbar
          per={per}
          q={q}
          type={typeFilter}
          internal={internalFilter}
          layout={layout}
          availableTypes={availableTypes}
        />
        {layout === "grid" ? (
          <TransformsGrid transforms={visible} />
        ) : (
          <TransformsTable transforms={visible} />
        )}
        <Pagination
          page={page}
          per={per}
          q={q}
          type={typeFilter}
          internal={internalFilter}
          layout={layout}
          totalPages={totalPages}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </div>
    </div>
  );
}
