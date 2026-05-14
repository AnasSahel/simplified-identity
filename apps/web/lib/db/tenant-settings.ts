import "server-only";

import { eq } from "drizzle-orm";

import { db } from "./index";
import { tenantSettings } from "./schema";

/**
 * Tenant-scoped configuration knobs read by feature surfaces. Keep this
 * module free of IO beyond the single `db` call and free of any
 * env-dependent state — it must work for tenants that have no row yet
 * (defaults kick in).
 *
 * Future #107 / #108 add `externalProfileIds` and `preboardLcsNames`
 * to the `TenantSettings` shape and to the read fallback.
 */

export const DEFAULT_AGGREGATION_FRESHNESS_THRESHOLD_HOURS = 24;

export type TenantSettings = {
  aggregationFreshnessThresholdHours: number;
};

const DEFAULTS: TenantSettings = {
  aggregationFreshnessThresholdHours:
    DEFAULT_AGGREGATION_FRESHNESS_THRESHOLD_HOURS,
};

export async function getTenantSettings(
  userId: string,
): Promise<TenantSettings> {
  const rows = await db
    .select()
    .from(tenantSettings)
    .where(eq(tenantSettings.userId, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return DEFAULTS;

  return {
    aggregationFreshnessThresholdHours:
      row.aggregationFreshnessThresholdHours ??
      DEFAULT_AGGREGATION_FRESHNESS_THRESHOLD_HOURS,
  };
}
