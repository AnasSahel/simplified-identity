"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  processIdentities,
  processIdentity,
} from "@/lib/sailpoint/identities-api";

export type ProcessActionResult =
  | { ok: true; taskId?: string; count?: number }
  | { ok: false; error: string };

const BULK_PROCESS_MAX = 100;

export async function processIdentityAction(
  id: string,
): Promise<ProcessActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  if (!id || id.trim() === "") {
    return { ok: false, error: "Identity id is required." };
  }

  const result = await processIdentity(session.user.id, id);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.status > 0
          ? `${result.status} ${result.message}`
          : result.message,
    };
  }
  revalidatePath(`/sailpoint/identities/${id}`);
  return { ok: true, taskId: result.taskId };
}

export async function processIdentitiesAction(
  ids: string[],
): Promise<ProcessActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  const cleaned = ids.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { ok: false, error: "No identities selected." };
  }
  if (cleaned.length > BULK_PROCESS_MAX) {
    return {
      ok: false,
      error: `Too many identities selected (${cleaned.length}). Limit is ${BULK_PROCESS_MAX} per run.`,
    };
  }

  const result = await processIdentities(session.user.id, cleaned);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.status > 0
          ? `${result.status} ${result.message}`
          : result.message,
    };
  }
  revalidatePath("/sailpoint/identities");
  return { ok: true, taskId: result.taskId, count: cleaned.length };
}
