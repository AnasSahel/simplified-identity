import "server-only";

import {
  sailpointFetch as pureFetch,
  sailpointCount as pureCount,
  tenantBaseUrl,
  type SailpointClientOptions,
  type SailpointFetchResult,
} from "@simplified-identity/sailpoint-client";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export type {
  SailpointClientOptions,
  SailpointFetchError,
  SailpointFetchResult,
} from "@simplified-identity/sailpoint-client";

const REFRESH_LEEWAY_MS = 60_000; // refresh 1 minute before expiry

function appBaseUrl(): string | null {
  const tenant = process.env.SAILPOINT_TENANT;
  return tenant ? tenantBaseUrl(tenant) : null;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
} | null> {
  const tenant = process.env.SAILPOINT_TENANT;
  const clientId = process.env.SAILPOINT_CLIENT_ID;
  const clientSecret = process.env.SAILPOINT_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) return null;

  const res = await fetch(`https://${tenant}.api.identitynow.com/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(
      "[SailPoint] refresh_token grant failed:",
      res.status,
      res.statusText,
    );
    return null;
  }
  return res.json();
}

// Per-user refresh coalescing. SailPoint rotates the refresh_token on every
// grant so two simultaneous expired-token calls would both try to refresh,
// one wins, the other dies. We collapse all concurrent refreshes for the
// same user into a single in-flight promise.
const inflightRefreshes = new Map<string, Promise<string | null>>();

type AccountRow = typeof schema.account.$inferSelect;

async function performRefresh(row: AccountRow): Promise<string | null> {
  if (!row.refreshToken) return row.accessToken;

  const refreshed = await refreshAccessToken(row.refreshToken);
  if (!refreshed?.access_token) return null;

  const newExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null;

  await db
    .update(schema.account)
    .set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? row.refreshToken,
      accessTokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.account.id, row.id));

  return refreshed.access_token;
}

async function getAccessTokenForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "sailpoint"),
      ),
    )
    .limit(1);

  if (!row) return null;

  const now = Date.now();
  const expiresAt = row.accessTokenExpiresAt?.getTime() ?? 0;

  if (row.accessToken && expiresAt - REFRESH_LEEWAY_MS > now) {
    return row.accessToken;
  }

  // Coalesce concurrent refreshes per-user
  let pending = inflightRefreshes.get(userId);
  if (!pending) {
    pending = performRefresh(row).finally(() => {
      inflightRefreshes.delete(userId);
    });
    inflightRefreshes.set(userId, pending);
  }
  return pending;
}

/**
 * Resolve the client options for a given user — baseUrl from env + access
 * token from the DB-backed account row. Returns `null` if the tenant isn't
 * configured or the user isn't connected. Shared by `sailpointFetch`,
 * `sailpointCount`, and the transforms-api wrappers.
 */
export async function getClientOptsForUser(
  userId: string,
): Promise<SailpointClientOptions | null> {
  const baseUrl = appBaseUrl();
  if (!baseUrl) return null;
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return null;
  return { baseUrl, accessToken };
}

export async function sailpointFetch<T>(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<SailpointFetchResult<T>> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return { ok: false, error: { kind: "not_connected" } };
  return pureFetch<T>(opts, path, init);
}

export async function sailpointCount(
  userId: string,
  path: string,
): Promise<number | undefined> {
  const opts = await getClientOptsForUser(userId);
  if (!opts) return undefined;
  return pureCount(opts, path);
}
