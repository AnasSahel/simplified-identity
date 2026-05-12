import {
  sailpointFetch,
  type SailpointClientOptions,
  type SailpointFetchError,
} from "./client";

/**
 * Identities API factory (v0).
 *
 * Six pure functions covering the read surface needed by the admin
 * Identities list + detail experience, plus the single write action
 * (`processIdentity`). Mirrors the shape of `transforms-api.ts`:
 *  - takes `SailpointClientOptions` explicitly (no DB / no auth state),
 *  - returns discriminated `{ ok }` results with `status` on failure so
 *    callers can branch on 403 without parsing a generic Error.
 *
 * Type coverage is deliberately narrow: only the fields consumers actually
 * read are typed. Anything else lives in `attributes: Record<string, unknown>`
 * — consumers cast at the point of use rather than relying on an exhaustive
 * schema that would rot the first time SailPoint adds a field.
 */

export type IdentityProfileRef = {
  id: string;
  name: string;
};

export type IdentityManagerRef = {
  id: string;
  name: string;
  type?: string;
};

export type IdentityLifecycleState = {
  stateName?: string | null;
  manuallyUpdated?: boolean;
};

export type IdentitySummary = {
  id: string;
  name: string;
  alias?: string | null;
  emailAddress?: string | null;
  identityStatus?: string | null;
  lifecycleState?: IdentityLifecycleState | null;
  identityProfile?: IdentityProfileRef | null;
  managerRef?: IdentityManagerRef | null;
  attributes?: Record<string, unknown> | null;
  created?: string;
  modified?: string;
};

export type IdentityDetail = IdentitySummary & {
  attributes: Record<string, unknown>;
};

export type IdentityProfileSummary = {
  id: string;
  name: string;
  description?: string | null;
};

export type IdentityAccount = {
  id: string;
  name?: string;
  nativeIdentity?: string | null;
  sourceId: string;
  sourceName: string;
  identityId?: string | null;
  uuid?: string | null;
  disabled?: boolean;
  locked?: boolean;
  authoritative?: boolean;
  manuallyCorrelated?: boolean;
  created?: string;
  modified?: string;
  attributes?: Record<string, unknown> | null;
};

export type IdentityAccessItemType =
  | "ROLE"
  | "ACCESS_PROFILE"
  | "ENTITLEMENT"
  | string;

export type IdentityAccessItem = {
  id: string;
  name: string;
  description?: string | null;
  accessType: IdentityAccessItemType;
  sourceName?: string | null;
  sourceId?: string | null;
  /**
   * SailPoint surfaces the origin of the assignment (role / access profile /
   * direct grant). Shape varies per accessType — kept loose on purpose.
   */
  standalone?: boolean;
  revocable?: boolean;
};

export type ListIdentitiesParams = {
  limit?: number;
  offset?: number;
  /** SailPoint SCIM-like filter expression (e.g. `name co "alice"`). */
  filters?: string;
  /** SailPoint sorters expression (e.g. `name` or `-modified`). */
  sorters?: string;
  /** Request `X-Total-Count` header for pagination. Defaults to false. */
  count?: boolean;
};

/**
 * Result shapes. We expose `status` so consumers can branch on 403 (no
 * permission to read the resource) without falling into a generic Error
 * path. 403 is the only non-200 status the issue calls out as a hot path,
 * but other api_error statuses propagate identically.
 */
export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export type ListResult<T> =
  | { ok: true; data: T[]; total?: number }
  | { ok: false; status: number; message: string };

export type ProcessIdentityResult =
  | { ok: true; taskId?: string }
  | { ok: false; status: number; message: string };

const NOT_CONNECTED_MESSAGE =
  "Not connected to SailPoint. Sign in again or check the tenant configuration.";

function mapError(err: SailpointFetchError): {
  ok: false;
  status: number;
  message: string;
} {
  if (err.kind === "not_connected") {
    return { ok: false, status: 0, message: NOT_CONNECTED_MESSAGE };
  }
  if (err.kind === "auth_failed") {
    return {
      ok: false,
      status: 401,
      message: "SailPoint rejected the access token. Sign in again.",
    };
  }
  return { ok: false, status: err.status, message: err.message };
}

function buildIdentitiesQuery(params: ListIdentitiesParams): string {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  if (params.filters) sp.set("filters", params.filters);
  if (params.sorters) sp.set("sorters", params.sorters);
  if (params.count) sp.set("count", "true");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * `GET /v2025/identities` — list page + filters.
 *
 * Supports server-side pagination and SailPoint's filter / sorter grammar.
 * When `params.count` is true we use a direct `fetch` instead of the shared
 * `sailpointFetch` helper, because we need access to the `X-Total-Count`
 * response header to drive pagination.
 */
export async function listIdentities(
  opts: SailpointClientOptions,
  params: ListIdentitiesParams = {},
): Promise<ListResult<IdentitySummary>> {
  const path = `/v2025/identities${buildIdentitiesQuery(params)}`;

  if (!params.count) {
    const result = await sailpointFetch<IdentitySummary[]>(opts, path);
    if (!result.ok) return mapError(result.error);
    return { ok: true, data: result.data };
  }

  // Header-aware path: we need X-Total-Count, which sailpointFetch hides.
  const res = await fetch(`${opts.baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return {
      ok: false,
      status: 401,
      message: "SailPoint rejected the access token. Sign in again.",
    };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: text || res.statusText,
    };
  }

  const totalHeader = res.headers.get("x-total-count");
  const total = totalHeader && !Number.isNaN(Number(totalHeader))
    ? Number(totalHeader)
    : undefined;

  if (
    res.status === 204 ||
    res.headers.get("content-length") === "0"
  ) {
    return { ok: true, data: [], total };
  }

  try {
    const data = (await res.json()) as IdentitySummary[];
    return { ok: true, data, total };
  } catch (e) {
    return {
      ok: false,
      status: res.status,
      message: `Couldn't parse SailPoint response: ${(e as Error).message}`,
    };
  }
}

/**
 * `GET /v2025/identities/{id}` — detail header + Attributes tab.
 */
export async function getIdentity(
  opts: SailpointClientOptions,
  id: string,
): Promise<FetchResult<IdentityDetail>> {
  const result = await sailpointFetch<IdentityDetail>(
    opts,
    `/v2025/identities/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: result.data };
}

/**
 * `GET /v2025/accounts?filters=identityId eq "{id}"` — Accounts tab.
 *
 * The v2025 accounts list endpoint takes its identity-scope via the
 * `filters` query param (SCIM-like), not via a top-level `identityId`
 * query param. We build the filter here so consumers don't have to know.
 */
export async function getIdentityAccounts(
  opts: SailpointClientOptions,
  id: string,
): Promise<FetchResult<IdentityAccount[]>> {
  const filters = `identityId eq "${id.replace(/"/g, '\\"')}"`;
  const qs = new URLSearchParams({
    filters,
    limit: "250",
  }).toString();
  const result = await sailpointFetch<IdentityAccount[]>(
    opts,
    `/v2025/accounts?${qs}`,
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: result.data };
}

/**
 * `GET /v2025/identities/{id}/access-items` — Access tab.
 *
 * Returns entitlements + access profiles + roles assigned to the identity,
 * each annotated with its `accessType` so the consumer can group.
 */
export async function getIdentityAccess(
  opts: SailpointClientOptions,
  id: string,
): Promise<FetchResult<IdentityAccessItem[]>> {
  const result = await sailpointFetch<IdentityAccessItem[]>(
    opts,
    `/v2025/identities/${encodeURIComponent(id)}/access-items`,
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: result.data };
}

/**
 * `POST /v2025/identities/process` — Process action.
 *
 * Re-runs identity processing for the given identity. SailPoint accepts a
 * batch of ids, but v0 ships a single-id action — the bulk variant lives
 * in a later issue.
 *
 * Returns 202 Accepted with no body in the common case; an optional task
 * id may be present in the response.
 */
export async function processIdentity(
  opts: SailpointClientOptions,
  id: string,
): Promise<ProcessIdentityResult> {
  const result = await sailpointFetch<{ taskId?: string } | null>(
    opts,
    `/v2025/identities/process`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityIds: [id] }),
    },
  );
  if (!result.ok) {
    const m = mapError(result.error);
    return { ok: false, status: m.status, message: m.message };
  }
  return { ok: true, taskId: result.data?.taskId };
}

/**
 * `GET /v2025/identity-profiles` — profile filter dropdown.
 */
export async function listIdentityProfiles(
  opts: SailpointClientOptions,
): Promise<FetchResult<IdentityProfileSummary[]>> {
  const result = await sailpointFetch<IdentityProfileSummary[]>(
    opts,
    "/v2025/identity-profiles?limit=250",
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: result.data };
}
