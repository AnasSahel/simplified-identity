import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { TransformEditor } from "../../_components/transform-editor";

type FullTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  attributes?: Record<string, unknown>;
};
type TenantTransform = { id: string; name: string; type: string };
type TenantSource = { id: string; name: string };

export default async function EditTransformPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const userId = session.user.id;

  const [result, tenantTransformsResult, tenantSourcesResult] =
    await Promise.all([
      sailpointFetch<FullTransform>(
        userId,
        `/v2025/transforms/${encodeURIComponent(id)}`,
      ),
      sailpointFetch<TenantTransform[]>(
        userId,
        "/v2025/transforms?limit=250",
        { signal: AbortSignal.timeout(8000) },
      ).catch(() => ({
        ok: false as const,
        error: { kind: "api_error" as const, status: 0, message: "" },
      })),
      sailpointFetch<TenantSource[]>(
        userId,
        "/v2025/sources?limit=250",
        { signal: AbortSignal.timeout(8000) },
      ).catch(() => ({
        ok: false as const,
        error: { kind: "api_error" as const, status: 0, message: "" },
      })),
    ]);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-6">
        <Link
          href="/transforms"
          className="inline-flex h-7 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transforms
        </Link>
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="font-medium">Couldn't load transform</p>
          <p className="mt-1 font-mono text-xs">
            {result.error.kind === "api_error"
              ? `${result.error.status} ${result.error.message}`
              : result.error.kind}
          </p>
        </div>
      </div>
    );
  }

  if (result.data.internal) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-6">
        <Link
          href={`/transforms?selected=${encodeURIComponent(id)}`}
          className="inline-flex h-7 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              Built-in transforms are read-only
            </p>
            <p className="mt-1">
              <span className="font-mono">{result.data.name}</span> ships with
              the SailPoint tenant and can't be modified. Duplicate it and
              edit the copy if you need a variant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const initialJson = JSON.stringify(
    {
      name: result.data.name,
      type: result.data.type,
      attributes: result.data.attributes ?? {},
    },
    null,
    2,
  );

  return (
    <TransformEditor
      mode={{ kind: "edit", id, originalName: result.data.name }}
      initialJson={initialJson}
      tenantTransforms={
        tenantTransformsResult.ok ? tenantTransformsResult.data : []
      }
      tenantSources={
        tenantSourcesResult.ok ? tenantSourcesResult.data : []
      }
    />
  );
}
