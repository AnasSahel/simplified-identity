import "server-only";

import {
  countAccountEntitlements as pureCountAccountEntitlements,
  countAccounts as pureCountAccounts,
  countEntitlements as pureCountEntitlements,
  disableAccounts as pureDisableAccounts,
  getCorrelationConfig as pureGetCorrelationConfig,
  getSchemaMappings as pureGetSchemaMappings,
  getSource as pureGet,
  getSourceAccounts as pureGetAccounts,
  getSourceAggregationStatus as pureGetAggStatus,
  getSourceSchemas as pureGetSchemas,
  listSources as pureList,
  recorrelateAccounts as pureRecorrelateAccounts,
  refreshAccountsFromSource as pureRefreshAccountsFromSource,
  triggerAggregation as pureTrigger,
  type BulkAccountActionResult,
  type CorrelationConfig,
  type GetSourceAccountsParams,
  type ListSourcesParams,
  type SchemaMappings,
  type TriggerAggregationParams,
} from "@simplified-identity/sailpoint-client";

import { getClientOptsForUser } from "./client";

export type {
  AccountActionItemResult,
  AggregationType,
  BulkAccountActionResult,
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
  const opts = await getClientOptsForUser(userId);
  if (!opts) return 0;
  return pureCountEntitlements(opts, params);
}

/**
 * Best-effort entitlement count for a single account. Returns `undefined`
 * for any failure (not connected, auth error, API error) so the per-row
 * Entitlements column can render an em-dash rather than block the table.
 * `0` is returned when the account legitimately has no entitlements.
 */
export async function countAccountEntitlements(
  userId: string,
  accountId: string,
): Promise<number | undefined> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return undefined;
  return pureCountAccountEntitlements(opts, accountId);
}

const NOT_CONNECTED_MESSAGE =
  "Not connected to SailPoint. Sign in again or check the tenant configuration.";

/**
 * Build a "not connected" bulk result that mirrors the per-id outcome
 * shape so consumers can render the failure with the same UI path they
 * use for genuine per-id errors.
 */
function notConnectedBulkResult(ids: string[]): BulkAccountActionResult {
  return {
    taskIds: ids.map(() => undefined),
    results: ids.map((id) => ({
      ok: false as const,
      accountId: id,
      status: 0,
      message: NOT_CONNECTED_MESSAGE,
    })),
  };
}

/**
 * Re-correlate accounts against the identity graph (bulk action on the
 * Sources accounts table). Fans out one ISC request per id, surfaces
 * per-id outcomes — partial success is allowed.
 */
export async function recorrelateAccounts(
  userId: string,
  ids: string[],
): Promise<BulkAccountActionResult> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return notConnectedBulkResult(ids);
  return pureRecorrelateAccounts(opts, ids);
}

/**
 * Disable accounts on their source (bulk action on the Sources accounts
 * table). Fans out one ISC request per id, surfaces per-id outcomes —
 * partial success is allowed.
 */
export async function disableAccounts(
  userId: string,
  ids: string[],
): Promise<BulkAccountActionResult> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return notConnectedBulkResult(ids);
  return pureDisableAccounts(opts, ids);
}

/**
 * Refresh accounts directly from their connector source (bulk action on
 * the Sources accounts table). Fans out one ISC request per id, surfaces
 * per-id outcomes — partial success is allowed.
 */
export async function refreshAccountsFromSource(
  userId: string,
  ids: string[],
): Promise<BulkAccountActionResult> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return notConnectedBulkResult(ids);
  return pureRefreshAccountsFromSource(opts, ids);
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
