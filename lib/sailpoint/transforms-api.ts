import "server-only";

import { sailpointFetch } from "./client";

export type TransformPayload = {
  name: string;
  type: string;
  attributes: Record<string, unknown>;
};

export type CreateOrUpdateResult =
  | { ok: true; id: string; data: TransformPayload & { id: string; internal?: boolean } }
  | { ok: false; status: number; message: string };

/**
 * Create a new transform on the connected SailPoint tenant.
 * Returns the new transform's id on success.
 */
export async function createTransform(
  userId: string,
  payload: TransformPayload,
): Promise<CreateOrUpdateResult> {
  const result = await sailpointFetch<TransformPayload & { id: string }>(
    userId,
    "/v2025/transforms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!result.ok) {
    return mapError(result.error);
  }
  return { ok: true, id: result.data.id, data: result.data };
}

/**
 * Update an existing transform. SailPoint expects a full PUT — pass the
 * complete payload, not a partial.
 */
export async function updateTransform(
  userId: string,
  id: string,
  payload: TransformPayload,
): Promise<CreateOrUpdateResult> {
  const result = await sailpointFetch<TransformPayload & { id: string }>(
    userId,
    `/v2025/transforms/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!result.ok) {
    return mapError(result.error);
  }
  return { ok: true, id: result.data.id, data: result.data };
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Delete a transform on the connected SailPoint tenant.
 *
 * SailPoint accepts the DELETE even when the transform is referenced
 * by identity profiles or other transforms — downstream then breaks
 * silently. The caller is responsible for surfacing the usage count
 * and gating the action with a clear confirmation.
 */
export async function deleteTransform(
  userId: string,
  id: string,
): Promise<DeleteResult> {
  const result = await sailpointFetch<unknown>(
    userId,
    `/v2025/transforms/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!result.ok) {
    const m = mapError(result.error);
    return { ok: false, status: m.status, message: m.message };
  }
  return { ok: true };
}

function mapError(err: {
  kind: string;
  status?: number;
  message?: string;
}): CreateOrUpdateResult {
  if (err.kind === "not_connected") {
    return {
      ok: false,
      status: 0,
      message:
        "Not connected to SailPoint. Sign in again or check the tenant configuration.",
    };
  }
  if (err.kind === "auth_failed") {
    return {
      ok: false,
      status: 401,
      message: "SailPoint rejected the access token. Sign in again.",
    };
  }
  return {
    ok: false,
    status: err.status ?? 0,
    message: err.message ?? "Unknown SailPoint API error",
  };
}
