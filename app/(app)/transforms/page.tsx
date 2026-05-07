import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
const PAGE_SIZE = 20;

function viewFromParam(value: string | undefined): View {
  if (value === "custom" || value === "internal") return value;
  return "all";
}

function pageFromParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function buildHref(view: View, page: number): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/transforms?${qs}` : "/transforms";
}

function TransformsTable({
  transforms,
  showOrigin,
}: {
  transforms: SailpointTransform[];
  showOrigin: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[60%]">Name</TableHead>
            <TableHead>Type</TableHead>
            {showOrigin && <TableHead>Origin</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transforms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showOrigin ? 3 : 2}
                className="h-16 text-center text-sm text-muted-foreground"
              >
                No transforms in this view.
              </TableCell>
            </TableRow>
          ) : (
            transforms.map((t) => (
              <TableRow key={t.id} className="cursor-pointer">
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
                {showOrigin && (
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {t.internal ? "Built-in" : "Custom"}
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
  totalPages,
  total,
  startIdx,
  endIdx,
}: {
  view: View;
  page: number;
  totalPages: number;
  total: number;
  startIdx: number;
  endIdx: number;
}) {
  if (total === 0 || totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div>
        <span className="font-medium text-foreground">{startIdx}</span>–
        <span className="font-medium text-foreground">{endIdx}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild={!prevDisabled}
          disabled={prevDisabled}
          aria-disabled={prevDisabled}
        >
          {prevDisabled ? (
            <span>
              <ChevronLeft />
              Previous
            </span>
          ) : (
            <Link href={buildHref(view, page - 1)}>
              <ChevronLeft />
              Previous
            </Link>
          )}
        </Button>
        <span className="px-1 text-xs font-medium text-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          asChild={!nextDisabled}
          disabled={nextDisabled}
          aria-disabled={nextDisabled}
        >
          {nextDisabled ? (
            <span>
              Next
              <ChevronRight />
            </span>
          ) : (
            <Link href={buildHref(view, page + 1)}>
              Next
              <ChevronRight />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}

export default async function TransformsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const activeView = viewFromParam(params.view);

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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = pageFromParam(params.page);
  const page = Math.min(requestedPage, totalPages);
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          hrefFor={(key) => buildHref(key as View, 1)}
        />
      </div>
      <div className="space-y-3 pt-4">
        <TransformsTable
          transforms={visible}
          showOrigin={activeView === "all"}
        />
        <Pagination
          view={activeView}
          page={page}
          totalPages={totalPages}
          total={total}
          startIdx={startIdx}
          endIdx={endIdx}
        />
      </div>
    </div>
  );
}
