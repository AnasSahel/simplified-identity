import { headers } from "next/headers";
import Link from "next/link";

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

import { SailpointEmptyState } from "../_components/sailpoint-empty-state";

type SailpointTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  modified?: string;
  created?: string;
  attributes?: Record<string, unknown>;
};

function PageHeader({
  count,
}: {
  count: number | null;
}) {
  return (
    <div className="mb-8 flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight">Transforms</h1>
      <p className="text-muted-foreground">
        Identity transforms defined on the connected SailPoint tenant.
        {count !== null && ` ${count} total.`}
      </p>
    </div>
  );
}

export default async function TransformsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const result = await sailpointFetch<SailpointTransform[]>(
    session.user.id,
    "/v2025/transforms?limit=250",
  );

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <PageHeader count={null} />
        <SailpointEmptyState
          reason={result.error.kind}
          detail={
            result.error.kind === "api_error"
              ? `${result.error.status} ${result.error.message}`
              : undefined
          }
        />
      </div>
    );
  }

  const transforms = result.data;
  // SailPoint returns built-in transforms with internal=true. Surface user-authored first.
  const sorted = [...transforms].sort((a, b) => {
    const aInternal = a.internal ? 1 : 0;
    const bInternal = b.internal ? 1 : 0;
    if (aInternal !== bInternal) return aInternal - bInternal;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <PageHeader count={transforms.length} />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="text-right">Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transforms on this tenant.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((t) => (
                <TableRow key={t.id} className="cursor-pointer">
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
                  <TableCell className="text-xs">
                    {t.internal ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                        Built-in
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                        Custom
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {t.modified
                      ? new Date(t.modified).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
