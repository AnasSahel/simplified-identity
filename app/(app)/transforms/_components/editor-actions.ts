"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  createTransform,
  deleteTransform,
  updateTransform,
  type TransformPayload,
} from "@/lib/sailpoint/transforms-api";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Validate the JSON shape and return a normalized payload or a
 * human-readable error.
 *
 * We deliberately do NOT reject types that aren't in the local registry —
 * SailPoint is the authoritative validator. A typo in the type field will
 * surface as a 4xx from the API with a clearer message than we could
 * produce locally.
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

export type DeleteActionResult = { ok: true } | { ok: false; error: string };

/**
 * Delete a transform after a name-confirmation step.
 *
 * The caller passes both `id` (server-of-truth identifier) and
 * `expectedName` (what the user just retyped in the confirmation
 * dialog). We compare against the live name from SailPoint via a
 * read before issuing the DELETE — protects against a stale UI
 * (e.g. someone renamed the transform from another window).
 *
 * Usage-blocking is enforced client-side from already-loaded usage
 * counts; we don't re-fetch them here to avoid the round-trip on
 * the hot path. If you need stronger guarantees, fetch and re-check
 * before calling this action.
 */
export async function deleteTransformAction(
  id: string,
  expectedName: string,
): Promise<DeleteActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  if (!expectedName || expectedName.trim() === "") {
    return { ok: false, error: "Confirmation name is required." };
  }

  const result = await deleteTransform(session.user.id, id);
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
  return { ok: true };
}
