import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";

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
import { StatusDot } from "../_components/status-dot";
import { ViewTabs, type ViewTab } from "../_components/view-tabs";

type SailpointTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  modified?: string;
  created?: string;
  attributes?: Record<string, unknown>;
};

type View = "all" | "custom" | "internal";

function viewFromParam(value: string | undefined): View {
  if (value === "custom" || value === "internal") return value;
  return "all";
}

function PageActions() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/transforms">
        <RefreshCw />
        Refresh
      </Link>
    </Button>
  );
}

function TransformsTable({
  transforms,
}: {
  transforms: SailpointTransform[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[40%]">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead className="text-right">Modified</TableHead>
            <TableHead className="w-10" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transforms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-20 text-center text-sm text-muted-foreground"
              >
                No transforms in this view.
              </TableCell>
            </TableRow>
          ) : (
            transforms.map((t) => (
              <TableRow key={t.id} className="group">
                <TableCell className="font-medium">
                  <Link
                    href={`/transforms/${encodeURIComponent(t.id)}`}
                    className="block w-full hover:underline"
                  >
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.type}
                </TableCell>
                <TableCell>
                  {t.internal ? (
                    <StatusDot tone="neutral">Built-in</StatusDot>
                  ) : (
                    <StatusDot tone="emerald">Custom</StatusDot>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {t.modified
                    ? new Date(t.modified).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/transforms/${encodeURIComponent(t.id)}`}
                    aria-label={`Open ${t.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function TransformsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
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
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <PageHeader
          title="Transforms"
          description="Identity transforms defined on the connected SailPoint tenant."
          actions={<PageActions />}
        />
        <div className="pt-8">
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

  const visible =
    activeView === "custom"
      ? custom
      : activeView === "internal"
        ? internal
        : all;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader
        title="Transforms"
        description="Identity transforms defined on the connected SailPoint tenant."
        actions={<PageActions />}
      />
      <div className="pt-6">
        <ViewTabs
          tabs={tabs}
          active={activeView}
          hrefFor={(key) => (key === "all" ? "/transforms" : `/transforms?view=${key}`)}
        />
      </div>
      <div className="pt-6">
        <TransformsTable transforms={visible} />
      </div>
    </div>
  );
}
