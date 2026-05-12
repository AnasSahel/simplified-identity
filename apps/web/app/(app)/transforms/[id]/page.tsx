import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { CopyButton } from "../../_components/copy-button";
import { JsonView } from "../../_components/json-view";
import { PageHeader } from "../../_components/page-header";
import { SailpointEmptyState } from "../../_components/sailpoint-empty-state";
import { StatusDot } from "../../_components/status-dot";

type SailpointTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  created?: string;
  modified?: string;
  attributes?: Record<string, unknown>;
};

function MetadataItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
    <div className="mx-auto w-full max-w-4xl px-6 py-6">
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
            description="SailPoint identity transform definition."
            actions={
              <CopyButton
                label="Copy JSON"
                copiedLabel="Copied"
                value={JSON.stringify(result.data, null, 2)}
              />
            }
          />

          <div className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetadataItem label="Type">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {result.data.type}
              </code>
            </MetadataItem>
            <MetadataItem label="Internal">
              {result.data.internal ? (
                <StatusDot tone="emerald">Yes</StatusDot>
              ) : (
                <StatusDot tone="neutral">No</StatusDot>
              )}
            </MetadataItem>
            {formatDate(result.data.created) && (
              <MetadataItem label="Created">
                <span className="text-muted-foreground">
                  {formatDate(result.data.created)}
                </span>
              </MetadataItem>
            )}
            {formatDate(result.data.modified) && (
              <MetadataItem label="Modified">
                <span className="text-muted-foreground">
                  {formatDate(result.data.modified)}
                </span>
              </MetadataItem>
            )}
            <MetadataItem label="ID">
              <code className="block break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {result.data.id}
              </code>
            </MetadataItem>
          </div>

          <div className="pt-6">
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Definition
                </span>
              </div>
              <JsonView data={result.data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
