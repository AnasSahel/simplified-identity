import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { sailpointFetch } from "@/lib/sailpoint/client";

import { TransformEditor } from "../_components/transform-editor";

type TenantTransform = { id: string; name: string; type: string };
type TenantSource = { id: string; name: string };

export default async function NewTransformPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userId = session.user.id;
  const [transformsResult, sourcesResult] = await Promise.all([
    sailpointFetch<TenantTransform[]>(
      userId,
      "/v2025/transforms?limit=250",
      { signal: AbortSignal.timeout(8000) },
    ).catch(() => ({ ok: false as const, error: { kind: "api_error" as const, status: 0, message: "" } })),
    sailpointFetch<TenantSource[]>(
      userId,
      "/v2025/sources?limit=250",
      { signal: AbortSignal.timeout(8000) },
    ).catch(() => ({ ok: false as const, error: { kind: "api_error" as const, status: 0, message: "" } })),
  ]);

  return (
    <TransformEditor
      mode={{ kind: "new" }}
      tenantTransforms={transformsResult.ok ? transformsResult.data : []}
      tenantSources={sourcesResult.ok ? sourcesResult.data : []}
    />
  );
}
