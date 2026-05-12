"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { processIdentity } from "@/lib/sailpoint/identities-api";

export type ProcessActionResult =
  | { ok: true; taskId?: string }
  | { ok: false; error: string };

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
  revalidatePath(`/identities/${id}`);
  return { ok: true, taskId: result.taskId };
}
