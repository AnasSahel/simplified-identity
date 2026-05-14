import "server-only";

import {
  countAccounts as pureCountAccounts,
  countEntitlements as pureCountEntitlements,
  getCorrelationConfig as pureGetCorrelationConfig,
  getSchemaMappings as pureGetSchemaMappings,
  getSource as pureGet,
  getSourceAccounts as pureGetAccounts,
  getSourceAggregationStatus as pureGetAggStatus,
  getSourceSchemas as pureGetSchemas,
  listSources as pureList,
  triggerAggregation as pureTrigger,
  type CorrelationConfig,
  type GetSourceAccountsParams,
  type ListSourcesParams,
  type SchemaMappings,
  type TriggerAggregationParams,
} from "@simplified-identity/sailpoint-client";

import { getClientOptsForUser } from "./client";

export type {
  AggregationType,
  CorrelationAttributeAssignment,
  CorrelationConfig,
  GetSourceAccountsParams,
  ListSourcesParams,
  SchemaMappingEntry,
  SchemaMappings,
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
 * Best-effort entitlement count for a single source. Returns `undefined`
 * for any failure (not connected, auth error, API error) so KPI cells can
 * render "—" rather than disrupt the page.
 */
export async function countEntitlements(
  userId: string,
  params: { sourceId: string },
): Promise<number | undefined> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return undefined;
  return pureCountEntitlements(opts, params);
}

/**
 * Per-source schema mappings — backs the Provisioning tab attribute table.
 * Returns `null` when the user isn't connected or when ISC returns 404
 * (sources without provisioning policies). Other failures propagate as
 * thrown errors so the caller can render an error state.
 */
export async function getSchemaMappings(
  userId: string,
  sourceId: string,
): Promise<SchemaMappings | null> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return null;
  return pureGetSchemaMappings(opts, sourceId);
}

/**
 * Per-source correlation config — backs the Provisioning tab correlation
 * rules section. Returns `null` when the user isn't connected or when ISC
 * returns 404 (non-authoritative sources). Other failures throw.
 */
export async function getCorrelationConfig(
  userId: string,
  sourceId: string,
): Promise<CorrelationConfig | null> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return null;
  return pureGetCorrelationConfig(opts, sourceId);
}
