import "server-only";

import {
  getAttributeUsageInIdentityProfiles as pureGetUsageInProfiles,
  getAttributeUsageInTransforms as pureGetUsageInTransforms,
  getIdentityAttribute as pureGet,
  listIdentityAttributes as pureList,
  type ListIdentityAttributesParams,
} from "@simplified-identity/sailpoint-client";

import { getClientOptsForUser } from "./client";

export type {
  AttributeUsageInIdentityProfile,
  AttributeUsageInTransform,
  IdentityAttributeDetail,
  IdentityAttributeSource,
  IdentityAttributeSummary,
  ListIdentityAttributesParams,
} from "@simplified-identity/sailpoint-client";

const NOT_CONNECTED = {
  ok: false as const,
  status: 0,
  message:
    "Not connected to SailPoint. Sign in again or check the tenant configuration.",
};

export async function listIdentityAttributes(
  userId: string,
  params: ListIdentityAttributesParams = {},
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureList(opts, params);
}

export async function getIdentityAttribute(userId: string, name: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGet(opts, name);
}

export async function getAttributeUsageInTransforms(
  userId: string,
  attributeName: string,
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetUsageInTransforms(opts, attributeName);
}

export async function getAttributeUsageInIdentityProfiles(
  userId: string,
  attributeName: string,
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGetUsageInProfiles(opts, attributeName);
}
