"use server";

import { lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  computeAttributeDrift,
  getAttributeProfileMapping,
} from "@/lib/sailpoint/identity-attributes-api";

export type RefreshDriftResult =
  | {
      ok: true;
      refreshed: number;
      durationMs: number;
      capturedAt: Date;
      failures: number;
    }
  | { ok: false; error: string };

/**
 * Refresh the identity-attribute drift snapshot (issue #207).
 *
 * Walks every identity attribute that's mapped on at least one identity
 * profile, calls `computeAttributeDrift` for each (2 search calls per
 * attribute, both scoped to the mapping profile IDs), and upserts the
 * result into `identity_attribute_drift_snapshot`. Attributes with no
 * profile mapping are skipped (drift is meaningless for them — they're
 * "unused", which is a separate signal).
 *
 * Errors are scoped per attribute — if one drift compute fails (ISC
 * throttling, transient 5xx), we log + continue and let the rest
 * succeed. The failed attributes are tracked in the `failures` count
 * but don't fail the whole refresh.
 *
 * After successful refresh: clears existing rows for attributes that
 * are no longer mapped (drift no longer applies), and `revalidatePath`s
 * the list + detail routes so the new snapshot renders without a
 * client-side reload.
 *
 * Per the ADR: this is the only place that writes to the snapshot
 * table. v1 trigger is the manual button on the list page header; a
 * future cron will reuse this same action.
 */
export async function refreshIdentityAttributeDrift(): Promise<RefreshDriftResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Not signed in." };

  const userId = session.user.id;
  const startedAt = Date.now();

  const mappingResult = await getAttributeProfileMapping(userId);
  if (!mappingResult.ok) {
    return {
      ok: false,
      error:
        mappingResult.status > 0
          ? `${mappingResult.status} ${mappingResult.message}`
          : mappingResult.message,
    };
  }

  const capturedAt = new Date();
  let refreshed = 0;
  let failures = 0;

  // Per-attribute drift compute. We serialise the calls (vs Promise.all)
  // because ISC throttles aggressively on burst search traffic and the
  // payload is tiny — sequential is the steadier path. A future cron
  // can introduce a small concurrency window if needed.
  for (const entry of mappingResult.data) {
    if (entry.profileIds.length === 0) continue;
    try {
      const driftResult = await computeAttributeDrift(userId, {
        attributeName: entry.attributeName,
        profileIds: entry.profileIds,
      });
      if (!driftResult.ok) {
        failures += 1;
        console.warn(
          `[drift] ${entry.attributeName}: ${driftResult.status} ${driftResult.message}`,
        );
        continue;
      }
      const row = driftResult.data;
      await db
        .insert(schema.identityAttributeDriftSnapshot)
        .values({
          attributeName: row.attributeName,
          populatedCount: row.populatedCount,
          totalCount: row.totalCount,
          nullRatio: row.nullRatio,
          tier: row.tier,
          mappingProfileIds: row.mappingProfileIds,
          capturedAt,
        })
        .onConflictDoUpdate({
          target: schema.identityAttributeDriftSnapshot.attributeName,
          set: {
            populatedCount: row.populatedCount,
            totalCount: row.totalCount,
            nullRatio: row.nullRatio,
            tier: row.tier,
            mappingProfileIds: row.mappingProfileIds,
            capturedAt,
          },
        });
      refreshed += 1;
    } catch (e) {
      failures += 1;
      console.warn(
        `[drift] ${entry.attributeName}: unexpected error`,
        (e as Error).message,
      );
    }
  }

  // Drop rows for attributes that were skipped this run (the attribute
  // was unmapped since last refresh, or its compute failed for the
  // first time). Anything not touched in this refresh — i.e. older
  // than `capturedAt` — is stale and gets cleared so the page doesn't
  // surface ghost data.
  await db
    .delete(schema.identityAttributeDriftSnapshot)
    .where(lt(schema.identityAttributeDriftSnapshot.capturedAt, capturedAt));

  const durationMs = Date.now() - startedAt;
  revalidatePath("/sailpoint/identity-attributes");
  revalidatePath("/sailpoint/identity-attributes/[name]", "page");

  return {
    ok: true,
    refreshed,
    durationMs,
    capturedAt,
    failures,
  };
}
