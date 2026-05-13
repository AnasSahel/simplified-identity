import "server-only";

import {
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
