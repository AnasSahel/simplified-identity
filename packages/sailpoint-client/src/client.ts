/**
 * Pure SailPoint Identity Security Cloud HTTP client.
 *
 * No DB, no auth-state, no env reads — takes baseUrl + accessToken
 * explicitly. App-side wrappers (e.g. apps/web/lib/sailpoint/client.ts)
 * resolve those from their own auth state and call into here.
 */

export type SailpointFetchError =
  | { kind: "not_connected" }
  | { kind: "auth_failed"; message: string }
  | { kind: "api_error"; status: number; message: string };

export type SailpointFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SailpointFetchError };

export type SailpointClientOptions = {
  baseUrl: string;
  accessToken: string;
};

export function tenantBaseUrl(tenant: string): string {
  return `https://${tenant}.api.identitynow.com`;
}

export async function sailpointFetch<T>(
  opts: SailpointClientOptions,
  path: string,
  init?: RequestInit,
): Promise<SailpointFetchResult<T>> {
  const res = await fetch(`${opts.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
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

  // 204 No Content (typical for DELETE) and other empty-body successes
  // would crash on res.json() with "Unexpected end of JSON input".
  // Hand back `undefined as T` and let the caller decide what to do.
  if (
    res.status === 204 ||
    res.headers.get("content-length") === "0"
  ) {
    return { ok: true, data: undefined as T };
  }
  const text = await res.text();
  if (text === "") {
    return { ok: true, data: undefined as T };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "api_error",
        status: res.status,
        message: `Couldn't parse SailPoint response: ${(e as Error).message}`,
      },
    };
  }
}

/**
 * Lightweight count helper. Uses `count=true&limit=1` on list endpoints to
 * pull the total via `X-Total-Count` while keeping payload tiny.
 *
 * Returns `undefined` on any failure — callers should treat it as "no badge"
 * rather than a hard error, since this is best-effort sidebar telemetry.
 */
export async function sailpointCount(
  opts: SailpointClientOptions,
  path: string,
): Promise<number | undefined> {
  const sep = path.includes("?") ? "&" : "?";
  const finalPath = `${path}${sep}count=true&limit=1`;

  try {
    const res = await fetch(`${opts.baseUrl}${finalPath}`, {
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;
    const total = res.headers.get("x-total-count");
    if (total) {
      const n = Number(total);
      return Number.isFinite(n) ? n : undefined;
    }
    // Fallback: count array length when the endpoint doesn't expose the header.
    const data: unknown = await res.json();
    if (Array.isArray(data)) return data.length;
    return undefined;
  } catch {
    return undefined;
  }
}
