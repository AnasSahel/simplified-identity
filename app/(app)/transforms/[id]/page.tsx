import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { PageHeader } from "../../_components/page-header";
import { SailpointEmptyState } from "../../_components/sailpoint-empty-state";
import { StatusDot } from "../../_components/status-dot";

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
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link href="/transforms">
          <ArrowLeft />
          All transforms
        </Link>
      </Button>

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
          <PageHeader
            title={result.data.name}
            description={`${result.data.type} · id ${result.data.id}`}
            actions={
              result.data.internal ? (
                <StatusDot tone="neutral">Built-in</StatusDot>
              ) : (
                <StatusDot tone="emerald">Custom</StatusDot>
              )
            }
          />
          <div className="pt-6">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  JSON
                </span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
