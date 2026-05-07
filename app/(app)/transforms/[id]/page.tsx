import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { SailpointEmptyState } from "../../_components/sailpoint-empty-state";

type SailpointTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  attributes?: Record<string, unknown>;
};

export default async function TransformDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const result = await sailpointFetch<SailpointTransform>(
    session.user.id,
    `/v2025/transforms/${encodeURIComponent(id)}`,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/transforms">
            <ArrowLeft />
            All transforms
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <SailpointEmptyState
          reason={result.error.kind}
          detail={
            result.error.kind === "api_error"
              ? `${result.error.status} ${result.error.message}`
              : undefined
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {result.data.name}
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              {result.data.type} · id {result.data.id}
              {result.data.internal ? " · built-in" : ""}
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              JSON
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
