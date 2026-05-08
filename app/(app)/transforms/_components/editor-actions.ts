"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createTransform,
  updateTransform,
  type TransformPayload,
} from "@/lib/sailpoint/transforms-api";
import { getSpec } from "@/lib/sailpoint/transforms/registry";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Validate the JSON string and shape against the registry. Returns either a
 * normalized payload or a human-readable error.
 */
function validateAndParse(
  jsonString: string,
): { ok: true; payload: TransformPayload } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Top-level value must be a JSON object." };
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.name !== "string" || o.name.trim() === "") {
    return { ok: false, error: "`name` must be a non-empty string." };
  }
  if (typeof o.type !== "string" || o.type.trim() === "") {
    return { ok: false, error: "`type` must be a non-empty string." };
  }
  if (
    typeof o.attributes !== "object" ||
    o.attributes === null ||
    Array.isArray(o.attributes)
  ) {
    return { ok: false, error: "`attributes` must be a JSON object." };
  }
  if (!getSpec(o.type)) {
    return {
      ok: false,
      error: `Unknown transform type "${o.type}". The local registry doesn't recognise it — SailPoint may still accept it, but double-check the spelling.`,
    };
  }
  return {
    ok: true,
    payload: {
      name: o.name,
      type: o.type,
      attributes: o.attributes as Record<string, unknown>,
    },
  };
}

export async function createTransformAction(
  jsonString: string,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  const validated = validateAndParse(jsonString);
  if (!validated.ok) return { ok: false, error: validated.error };

  const result = await createTransform(session.user.id, validated.payload);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.status > 0
          ? `${result.status} ${result.message}`
          : result.message,
    };
  }
  revalidatePath("/transforms");
  return { ok: true, id: result.id };
}

export async function updateTransformAction(
  id: string,
  jsonString: string,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  const validated = validateAndParse(jsonString);
  if (!validated.ok) return { ok: false, error: validated.error };

  const result = await updateTransform(session.user.id, id, validated.payload);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.status > 0
          ? `${result.status} ${result.message}`
          : result.message,
    };
  }
  revalidatePath("/transforms");
  revalidatePath(`/transforms/${id}`);
  return { ok: true, id: result.id };
}
