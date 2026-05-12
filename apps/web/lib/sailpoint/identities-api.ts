import "server-only";

import {
  getIdentity as pureGet,
  getIdentityAccess as pureGetAccess,
  getIdentityAccounts as pureGetAccounts,
  listIdentities as pureList,
  listIdentityProfiles as pureListProfiles,
  processIdentity as pureProcess,
  type ListIdentitiesParams,
} from "@simplified-identity/sailpoint-client";

import { getClientOptsForUser } from "./client";

export type {
  IdentityAccessItem,
  IdentityAccessItemType,
  IdentityAccount,
  IdentityDetail,
  IdentityLifecycleState,
  IdentityManagerRef,
  IdentityProfileRef,
  IdentityProfileSummary,
  IdentitySummary,
  ListIdentitiesParams,
  ListResult,
  ProcessIdentityResult,
} from "@simplified-identity/sailpoint-client";

const NOT_CONNECTED = {
  ok: false as const,
  status: 0,
  message:
    "Not connected to SailPoint. Sign in again or check the tenant configuration.",
};

export async function listIdentities(
  userId: string,
  params: ListIdentitiesParams = {},
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureList(opts, params);
}

export async function getIdentity(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGet(opts, id);
}

export async function getIdentityAccounts(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetAccounts(opts, id);
}

export async function getIdentityAccess(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetAccess(opts, id);
}

export async function processIdentity(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureProcess(opts, id);
}

export async function listIdentityProfiles(userId: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureListProfiles(opts);
}
