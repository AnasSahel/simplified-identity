import "server-only";

import { desc } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export type DriftSnapshotRow = {
  attributeName: string;
  populatedCount: number;
  totalCount: number;
  nullRatio: number;
  tier: "ok" | "warning" | "danger";
  mappingProfileIds: string[];
  capturedAt: Date;
};

export type DriftSnapshotReadResult = {
  rows: DriftSnapshotRow[];
  /** `null` when the snapshot table is empty (no refresh has run yet). */
  capturedAt: Date | null;
};

/**
 * Read helper for the drift snapshot — used by the list page, the
 * detail page, and the KPI strip. Capped to a single SELECT; the
 * snapshot table is one row per attribute (typically 50–100), so no
 * pagination needed.
 *
 * `capturedAt` is the max across rows (the snapshot is written in a
 * single transaction, so in practice all rows share the same value —
 * but we max-aggregate to stay correct if a future partial refresh
 * lands).
 */
export async function getDriftSnapshot(): Promise<DriftSnapshotReadResult> {
  const rows = await db
    .select()
    .from(schema.identityAttributeDriftSnapshot)
    .orderBy(desc(schema.identityAttributeDriftSnapshot.capturedAt));

  if (rows.length === 0) {
    return { rows: [], capturedAt: null };
  }

  const mapped: DriftSnapshotRow[] = rows.map((r) => ({
    attributeName: r.attributeName,
    populatedCount: r.populatedCount,
    totalCount: r.totalCount,
    nullRatio: r.nullRatio,
    tier: r.tier,
    mappingProfileIds: r.mappingProfileIds,
    capturedAt: r.capturedAt,
  }));

  const capturedAt = mapped.reduce(
    (acc, r) => (r.capturedAt > acc ? r.capturedAt : acc),
    mapped[0].capturedAt,
  );

  return { rows: mapped, capturedAt };
}
