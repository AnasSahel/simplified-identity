import "server-only";

import {
  createTransform as pureCreate,
  deleteTransform as pureDelete,
  getTransform as pureGet,
  listTransforms as pureList,
  updateTransform as pureUpdate,
  type TransformPayload,
} from "@simplified-identity/sailpoint-client";

import { getClientOptsForUser } from "./client";

export type {
  CreateOrUpdateResult,
  DeleteResult,
  FetchResult,
  TransformPayload,
  TransformRecord,
} from "@simplified-identity/sailpoint-client";

const NOT_CONNECTED = {
  ok: false as const,
  status: 0,
  message:
    "Not connected to SailPoint. Sign in again or check the tenant configuration.",
};

export async function getTransform(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureGet(opts, id);
}

export async function listTransforms(userId: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureList(opts);
}

export async function createTransform(
  userId: string,
  payload: TransformPayload,
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureCreate(opts, payload);
}

export async function updateTransform(
  userId: string,
  id: string,
  payload: TransformPayload,
) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureUpdate(opts, id, payload);
}

export async function deleteTransform(userId: string, id: string) {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return NOT_CONNECTED;
  return pureDelete(opts, id);
}
