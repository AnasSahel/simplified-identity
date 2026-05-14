"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  triggerAggregation,
  type AggregationType,
} from "@/lib/sailpoint/sources-api";

/**
 * Result shape for the aggregation trigger action. Mirrors
 * `processIdentityAction` (PR #104) — discriminated `ok` flag, plain string
 * `error`, optional `taskId` so the UI can surface it in the success state.
 *
 * `triggered` is the list of aggregation kinds the user asked for, echoed
 * back so the success panel can render "accounts + entitlements" if both
 * were selected. Each entry carries its own `taskId` because ISC returns
 * one task per kind.
 */
export type TriggerAggregationActionResult =
  | {
      ok: true;
      triggered: Array<{ type: AggregationType; taskId?: string }>;
    }
  | { ok: false; error: string };

export async function triggerAggregationAction(
  id: string,
  types: AggregationType[],
): Promise<TriggerAggregationActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  if (!id || id.trim() === "") {
    return { ok: false, error: "Source id is required." };
  }

  // Dedupe and validate the requested kinds — the UI passes either
  // ["accounts"], ["entitlements"], or both. Anything else is a bug.
  const uniqueTypes = Array.from(new Set(types));
  if (uniqueTypes.length === 0) {
    return {
      ok: false,
      error: "Pick at least one aggregation type.",
    };
  }
  for (const t of uniqueTypes) {
    if (t !== "accounts" && t !== "entitlements") {
      return { ok: false, error: `Unknown aggregation type: ${t}` };
    }
  }

  const triggered: Array<{ type: AggregationType; taskId?: string }> = [];
  for (const type of uniqueTypes) {
    const result = await triggerAggregation(session.user.id, id, { type });
    if (!result.ok) {
      // 5xx → log to server console per the issue. 4xx surfaces as-is.
      if (result.status >= 500) {
        console.error(
          `[triggerAggregationAction] ISC ${result.status} on ${type} for source ${id}: ${result.message}`,
        );
      }
      // If the first kind already ran, surface a partial-success error so
      // the caller can see what landed and what didn't. The dialog reopens
      // closed on the next interaction.
      const partial =
        triggered.length > 0
          ? ` (already triggered: ${triggered.map((t) => t.type).join(", ")})`
          : "";
      return {
        ok: false,
        error:
          (result.status > 0
            ? `${result.status} ${result.message}`
            : result.message) + partial,
      };
    }
    triggered.push({ type, taskId: result.taskId });
  }

  revalidatePath(`/sailpoint/sources/${id}`);
  return { ok: true, triggered };
}
