import { headers } from "next/headers";

import { Pill } from "@/components/ui/pill";
import { StateView } from "@/components/ui/state-view";
import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { CopyButton } from "../../../_components/copy-button";
import {
  DetailHeader,
  DetailShell,
} from "../../../_components/detail-shell";
import { JsonView } from "../../../_components/json-view";

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
      <span className="si-caption uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="si-body text-foreground">{children}</span>
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

  if (!result.ok) {
    return (
      <DetailShell
        back={{ href: "/sailpoint/transforms", label: "All transforms" }}
        header={null}
      >
        <StateView
          intent={result.error.kind}
          title={
            result.error.kind === "not_connected"
              ? "Connect your SailPoint tenant"
              : result.error.kind === "auth_failed"
                ? "SailPoint session expired"
                : "SailPoint API error"
          }
          description={
            result.error.kind === "not_connected"
              ? "Sign in with SailPoint to load this transform from your tenant."
              : result.error.kind === "auth_failed"
                ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                : "The request failed. Try again, or contact your administrator if it persists."
          }
          detail={
            result.error.kind === "api_error"
              ? `${result.error.status} ${result.error.message}`
              : undefined
          }
        />
      </DetailShell>
    );
  }

  const data = result.data;
  return (
    <DetailShell
      back={{ href: "/sailpoint/transforms", label: "All transforms" }}
      header={
        <DetailHeader
          title={<span className="font-mono">{data.name}</span>}
          subtitle="SailPoint identity transform definition."
          badges={
            <Pill tone="accent" mono shape="square">
              {data.type}
            </Pill>
          }
          actions={
            <CopyButton
              label="Copy JSON"
              copiedLabel="Copied"
              value={JSON.stringify(data, null, 2)}
            />
          }
        />
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetadataItem label="Internal">
          {data.internal ? (
            <Pill tone="success" dot>
              Yes
            </Pill>
          ) : (
            <Pill tone="neutral" dot>
              No
            </Pill>
          )}
        </MetadataItem>
        {formatDate(data.created) && (
          <MetadataItem label="Created">
            <span className="text-muted-foreground">
              {formatDate(data.created)}
            </span>
          </MetadataItem>
        )}
        {formatDate(data.modified) && (
          <MetadataItem label="Modified">
            <span className="text-muted-foreground">
              {formatDate(data.modified)}
            </span>
          </MetadataItem>
        )}
        <MetadataItem label="ID">
          <code className="block break-all rounded bg-muted px-1.5 py-0.5 font-mono si-caption">
            {data.id}
          </code>
        </MetadataItem>
      </div>

      <div className="pt-6">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="si-caption uppercase tracking-wide text-muted-foreground">
              Definition
            </span>
          </div>
          <JsonView data={data} />
        </div>
      </div>
    </DetailShell>
  );
}
