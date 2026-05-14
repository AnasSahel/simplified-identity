import "server-only";

import {
  countAccounts as pureCountAccounts,
  countEntitlements as pureCountEntitlements,
  getSource as pureGet,
  getSourceAccounts as pureGetAccounts,
  getSourceAggregationStatus as pureGetAggStatus,
  getSourceSchemas as pureGetSchemas,
  listSources as pureList,
  triggerAggregation as pureTrigger,
  type GetSourceAccountsParams,
  type ListSourcesParams,
  type TriggerAggregationParams,
} from "@simplified-identity/sailpoint-client";

import { getClientOptsForUser } from "./client";

export type {
  AggregationType,
  GetSourceAccountsParams,
  ListSourcesParams,
  SourceAccount,
  SourceAggregationStatus,
  SourceDetail,
  SourceRef,
  SourceSchema,
  SourceSchemaAttribute,
  SourceSummary,
  TriggerAggregationParams,
  TriggerAggregationResult,
} from "@simplified-identity/sailpoint-client";

const NOT_CONNECTED = {
  ok: false as const,
  status: 0,
  message:
    "Not connected to SailPoint. Sign in again or check the tenant configuration.",
};

export async function listSources(
  userId: string,
  params: ListSourcesParams = {},
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureList(opts, params);
}

export async function getSource(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGet(opts, id);
}

export async function getSourceSchemas(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetSchemas(opts, id);
}

export async function getSourceAccounts(
  userId: string,
  id: string,
  params: GetSourceAccountsParams = {},
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetAccounts(opts, id, params);
}

export async function getSourceAggregationStatus(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetAggStatus(opts, id);
}

export async function triggerAggregation(
  userId: string,
  id: string,
  params: TriggerAggregationParams,
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureTrigger(opts, id, params);
}

/**
 * Best-effort global account count. Returns `undefined` for any failure
 * (not connected, auth error, API error) so KPI cells can render "—"
 * rather than disrupt the page.
 */
export async function countAccounts(
  userId: string,
  params: { filters?: string } = {},
): Promise<number | undefined> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return undefined;
  return pureCountAccounts(opts, params);
}

/**
 * Entitlement count for a single source. Always returns a `number` —
 * failures (not connected, auth error, API error, 404) collapse to `0`
 * so KPI cells render a value rather than disrupt the page.
 */
export async function countEntitlements(
  userId: string,
  params: { sourceId: string },
): Promise<number> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return 0;
  return pureCountEntitlements(opts, params);
}
