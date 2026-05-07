import { headers } from "next/headers";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { ViewTabs, type ViewTab } from "../_components/view-tabs";

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

function buildHref(view: View, page: number, per: PerPage): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (page > 1) params.set("page", String(page));
  if (per !== DEFAULT_PER) params.set("per", String(per));
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

function TransformsTable({
  transforms,
  showInternal,
}: {
  transforms: SailpointTransform[];
  showInternal: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[60%]">Name</TableHead>
            <TableHead>Type</TableHead>
            {showInternal && (
              <TableHead className="text-center">Internal</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transforms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showInternal ? 3 : 2}
                className="h-16 text-center text-sm text-muted-foreground"
              >
                No transforms in this view.
              </TableCell>
            </TableRow>
          ) : (
            transforms.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="py-2 font-medium">
                  <Link
                    href={`/transforms/${encodeURIComponent(t.id)}`}
                    className="block w-full hover:underline"
                  >
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                  {t.type}
                </TableCell>
                {showInternal && (
                  <TableCell className="py-2 text-center">
                    {t.internal ? (
                      <Check
                        aria-label="Internal"
                        className="inline-block h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      />
                    ) : (
                      <X
                        aria-label="Not internal"
                        className="inline-block h-4 w-4 text-rose-600 dark:text-rose-400"
                      />
                    )}
                  </TableCell>
                )}
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
  totalPages,
  total,
}: {
  view: View;
  page: number;
  per: PerPage;
  totalPages: number;
  total: number;
}) {
  if (total === 0) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const items = pagesToRender(page, totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Per-page selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {per} per page
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PAGE_SIZES.map((n) => (
            <DropdownMenuItem key={n} asChild>
              <Link href={buildHref(view, 1, n)}>
                {n} per page
                {n === per && <Check className="ml-auto h-4 w-4" />}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild={!prevDisabled}
            disabled={prevDisabled}
            aria-disabled={prevDisabled}
          >
            {prevDisabled ? (
              <span className="inline-flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </span>
            ) : (
              <Link href={buildHref(view, page - 1, per)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Link>
            )}
          </Button>

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
                  className={cn(
                    "inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-sm font-medium text-background",
                  )}
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildHref(view, item, per)}
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

          <Button
            variant="ghost"
            size="sm"
            asChild={!nextDisabled}
            disabled={nextDisabled}
            aria-disabled={nextDisabled}
          >
            {nextDisabled ? (
              <span className="inline-flex items-center gap-1">
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Link href={buildHref(view, page + 1, per)}>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {total} {total === 1 ? "transform" : "transforms"}
        </span>
      )}
    </div>
  );
}

export default async function TransformsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; per?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const activeView = viewFromParam(params.view);
  const per = perFromParam(params.per);

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

  const filtered =
    activeView === "custom"
      ? custom
      : activeView === "internal"
        ? internal
        : all;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const requestedPage = pageFromParam(params.page);
  const page = Math.min(requestedPage, totalPages);
  const visible = filtered.slice((page - 1) * per, page * per);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <PageHeader
        title="Transforms"
        description="Identity transforms defined on the connected SailPoint tenant."
      />
      <div className="pt-4">
        <ViewTabs
          tabs={tabs}
          active={activeView}
          hrefFor={(key) => buildHref(key as View, 1, per)}
        />
      </div>
      <div className="space-y-3 pt-4">
        <TransformsTable
          transforms={visible}
          showInternal={activeView === "all"}
        />
        <Pagination
          view={activeView}
          page={page}
          per={per}
          totalPages={totalPages}
          total={total}
        />
      </div>
    </div>
  );
}
