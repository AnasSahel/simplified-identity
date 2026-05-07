import "server-only";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const REFRESH_LEEWAY_MS = 60_000; // refresh 1 minute before expiry

export type SailpointFetchError =
  | { kind: "not_connected" }
  | { kind: "auth_failed"; message: string }
  | { kind: "api_error"; status: number; message: string };

export type SailpointFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SailpointFetchError };

function tenantBaseUrl(): string | null {
  const tenant = process.env.SAILPOINT_TENANT;
  return tenant ? `https://${tenant}.api.identitynow.com` : null;
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

  if (!row.refreshToken) {
    return row.accessToken; // best effort — let the API call fail with 401 if expired
  }

  const refreshed = await refreshAccessToken(row.refreshToken);
  if (!refreshed?.access_token) return null;

  const newExpiresAt = refreshed.expires_in
    ? new Date(now + refreshed.expires_in * 1000)
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

export async function sailpointFetch<T>(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<SailpointFetchResult<T>> {
  const base = tenantBaseUrl();
  if (!base) {
    return {
      ok: false,
      error: {
        kind: "not_connected",
      },
    };
  }

  const token = await getAccessTokenForUser(userId);
  if (!token) {
    return { ok: false, error: { kind: "not_connected" } };
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return {
      ok: false,
      error: {
        kind: "auth_failed",
        message:
          "SailPoint rejected the access token. The session may have been revoked — sign in again.",
      },
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      error: {
        kind: "api_error",
        status: res.status,
        message: text || res.statusText,
      },
    };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}
