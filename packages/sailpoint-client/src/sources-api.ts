import {
  sailpointCount,
  sailpointFetch,
  type SailpointClientOptions,
  type SailpointFetchError,
} from "./client";
import type { IdentityAccount } from "./identities-api";

/**
 * Sources API factory (v0).
 *
 * Six pure functions covering the read surface needed by the admin
 * Sources list + detail experience, plus the single write action
 * (`triggerAggregation`). Mirrors the shape of `identities-api.ts`:
 *  - takes `SailpointClientOptions` explicitly (no DB / no auth state),
 *  - returns discriminated `{ ok }` results with `status` on failure so
 *    callers can branch on 403 without parsing a generic Error.
 *
 * Type coverage is deliberately narrow: only the fields consumers actually
 * read are typed. `connectorAttributes` and `configuration` stay as
 * `Record<string, unknown>` — the schema varies per connector and
 * pretending otherwise would rot fast.
 */

export type SourceRef = {
  id: string;
  name: string;
  type?: string;
};

export type SourceSummary = {
  id: string;
  name: string;
  description?: string | null;
  /** ISC source kind (e.g. `OpenConnector`, `DelimitedFile`). */
  type?: string | null;
  /** Internal connector identifier (e.g. `active-directory`). */
  connector?: string | null;
  /** Human label for the connector (e.g. `Active Directory`). */
  connectorName?: string | null;
  connectorClass?: string | null;
  category?: string | null;
  authoritative?: boolean;
  /**
   * Embedded health snapshot from `/v2025/sources/{id}`. These flip on the
   * source object itself, not via a separate health endpoint — querying
   * `/beta/sources/{id}/health` returns the same values.
   */
  healthy?: boolean;
  status?: string | null;
  /** Timestamp at which the current `status` / `healthy` was set. */
  since?: string | null;
  features?: string[];
  cluster?: SourceRef | null;
  owner?: SourceRef | null;
  managerRef?: SourceRef | null;
  created?: string;
  modified?: string;
};

export type SourceDetail = SourceSummary & {
  /**
   * Connector-specific config bag. Shape is per-connector; consumers cast
   * at the point of use rather than declaring an exhaustive union.
   */
  connectorAttributes?: Record<string, unknown>;
  accountCorrelationConfig?: SourceRef | null;
  managerCorrelationRule?: SourceRef | null;
  beforeProvisioningRule?: SourceRef | null;
  /** Schema refs declared on the source (account + group + any custom). */
  schemas?: SourceRef[];
};

export type SourceSchemaAttribute = {
  name: string;
  type: string;
  isMulti?: boolean;
  isEntitlement?: boolean;
  isGroup?: boolean;
  description?: string | null;
  /** Reference to another schema on the same source (for nested types). */
  schema?: SourceRef | null;
};

/**
 * Schema returned by `GET /v2025/sources/{id}/schemas`. Source of truth for
 * the field list of accounts on this source — `account.attributes` can
 * carry legacy residues that aren't declared here.
 */
export type SourceSchema = {
  id: string;
  name: string;
  nativeObjectType?: string | null;
  identityAttribute?: string | null;
  displayAttribute?: string | null;
  hierarchyAttribute?: string | null;
  includePermissions?: boolean;
  features?: string[];
  configuration?: Record<string, unknown> | null;
  attributes: SourceSchemaAttribute[];
  created?: string;
  modified?: string;
};

/**
 * Account on a source. Same shape as `IdentityAccount` — both come from
 * `/v2025/accounts` (just filtered differently). Aliased rather than
 * redeclared so the two stay in lockstep.
 */
export type SourceAccount = IdentityAccount;

/**
 * Best-effort snapshot of the source's current aggregation health. Derived
 * from `GET /v2025/sources/{id}` because ISC doesn't expose a dedicated
 * per-source aggregation-status endpoint in v2025 — task / event history
 * would need an events-index search, which is out of scope for v0.
 *
 * Consumers that need a richer "last 5 runs" view should query the events
 * index directly.
 */
export type SourceAggregationStatus = {
  sourceId: string;
  healthy?: boolean;
  status?: string | null;
  since?: string | null;
};

export type ListSourcesParams = {
  limit?: number;
  offset?: number;
  /** SailPoint SCIM-like filter expression (e.g. `name co "ad"`). */
  filters?: string;
  /** SailPoint sorters expression (e.g. `name` or `-modified`). */
  sorters?: string;
  /** Request `X-Total-Count` header for pagination. Defaults to false. */
  count?: boolean;
};

export type GetSourceAccountsParams = {
  limit?: number;
  offset?: number;
  /**
   * Extra filter AND'd onto the source scope. The source filter
   * (`sourceId eq "..."`) is built automatically by `getSourceAccounts`.
   */
  filters?: string;
  /** Request `X-Total-Count` header for pagination. Defaults to false. */
  count?: boolean;
};

export type AggregationType = "accounts" | "entitlements";

export type TriggerAggregationParams = {
  type: AggregationType;
  /**
   * Force a full re-pull, bypassing the delta optimization. Maps to the
   * `disableOptimization=true` query param ISC exposes on the load
   * endpoints. Defaults to undefined (let ISC pick).
   */
  disableOptimization?: boolean;
};

export type TriggerAggregationResult =
  | { ok: true; taskId?: string }
  | { ok: false; status: number; message: string };

/**
 * Result shapes — duplicated locally (mirrors identities-api / transforms-api)
 * so the module stays self-contained. `status` surfaces so callers can
 * branch on 403 without parsing a generic Error.
 */
export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export type ListResult<T> =
  | { ok: true; data: T[]; total?: number }
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

function buildSourcesQuery(params: ListSourcesParams): string {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  if (params.filters) sp.set("filters", params.filters);
  if (params.sorters) sp.set("sorters", params.sorters);
  if (params.count) sp.set("count", "true");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function buildAccountsQuery(
  sourceId: string,
  params: GetSourceAccountsParams,
): string {
  const escaped = sourceId.replace(/"/g, '\\"');
  const sourceFilter = `sourceId eq "${escaped}"`;
  const filters = params.filters
    ? `${sourceFilter} and ${params.filters}`
    : sourceFilter;
  const sp = new URLSearchParams();
  sp.set("filters", filters);
  sp.set("limit", String(params.limit ?? 250));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  if (params.count) sp.set("count", "true");
  return `?${sp.toString()}`;
}

/**
 * Header-aware list fetch — needed when the caller wants `X-Total-Count`,
 * which `sailpointFetch` swallows. Returns the parsed array plus `total`
 * when the header is present.
 */
async function fetchListWithCount<T>(
  opts: SailpointClientOptions,
  path: string,
): Promise<ListResult<T>> {
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
    return { ok: false, status: res.status, message: text || res.statusText };
  }

  const totalHeader = res.headers.get("x-total-count");
  const total =
    totalHeader && !Number.isNaN(Number(totalHeader))
      ? Number(totalHeader)
      : undefined;

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return { ok: true, data: [], total };
  }

  try {
    const data = (await res.json()) as T[];
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
 * `GET /v2025/sources` — list page + filters.
 */
export async function listSources(
  opts: SailpointClientOptions,
  params: ListSourcesParams = {},
): Promise<ListResult<SourceSummary>> {
  const path = `/v2025/sources${buildSourcesQuery(params)}`;

  if (!params.count) {
    const result = await sailpointFetch<SourceSummary[]>(opts, path);
    if (!result.ok) return mapError(result.error);
    return { ok: true, data: result.data };
  }
  return fetchListWithCount<SourceSummary>(opts, path);
}

/**
 * `GET /v2025/sources/{id}` — detail header + Overview tab.
 */
export async function getSource(
  opts: SailpointClientOptions,
  id: string,
): Promise<FetchResult<SourceDetail>> {
  const result = await sailpointFetch<SourceDetail>(
    opts,
    `/v2025/sources/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: result.data };
}

/**
 * `GET /v2025/sources/{id}/schemas` — Schemas tab.
 *
 * Returns every schema declared on the source (typically `account` + `group`,
 * plus any connector-specific extras). This is the source of truth for the
 * field list — `account.attributes` may carry legacy residues that aren't
 * declared here.
 */
export async function getSourceSchemas(
  opts: SailpointClientOptions,
  id: string,
): Promise<FetchResult<SourceSchema[]>> {
  const result = await sailpointFetch<SourceSchema[]>(
    opts,
    `/v2025/sources/${encodeURIComponent(id)}/schemas`,
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: result.data };
}

/**
 * `GET /v2025/accounts?filters=sourceId eq "{id}"` — Accounts tab.
 *
 * The v2025 accounts list endpoint takes its source-scope via the
 * `filters` query param (SCIM-like), not via a top-level `sourceId`
 * query param. We build the filter here so consumers don't have to know,
 * and AND any caller-provided `filters` onto it.
 */
export async function getSourceAccounts(
  opts: SailpointClientOptions,
  id: string,
  params: GetSourceAccountsParams = {},
): Promise<ListResult<SourceAccount>> {
  const path = `/v2025/accounts${buildAccountsQuery(id, params)}`;

  if (!params.count) {
    const result = await sailpointFetch<SourceAccount[]>(opts, path);
    if (!result.ok) return mapError(result.error);
    return { ok: true, data: result.data };
  }
  return fetchListWithCount<SourceAccount>(opts, path);
}

/**
 * Best-effort aggregation health.
 *
 * Derived from `GET /v2025/sources/{id}` because ISC doesn't expose a
 * dedicated per-source aggregation-status endpoint in v2025. Returns
 * `healthy`, `status`, and `since` straight from the source payload.
 *
 * Consumers needing a "last 5 runs" history should query the events index
 * (`POST /v2025/search` against `indices=["events"]` with
 * `action:AGGREGATE AND target.id:"{id}"`). Out of scope for v0.
 */
export async function getSourceAggregationStatus(
  opts: SailpointClientOptions,
  id: string,
): Promise<FetchResult<SourceAggregationStatus>> {
  const result = await getSource(opts, id);
  if (!result.ok) return result;
  const { healthy, status, since } = result.data;
  return {
    ok: true,
    data: { sourceId: id, healthy, status, since },
  };
}

/**
 * `POST /v2025/sources/{id}/load-accounts` (or `load-entitlements`).
 *
 * Triggers an aggregation. Returns 202 Accepted with a task descriptor in
 * the common case; we surface `taskId` when present so callers can poll
 * task status. The endpoint accepts `disableOptimization=true` to force
 * a full re-pull (bypasses delta).
 */
export async function triggerAggregation(
  opts: SailpointClientOptions,
  id: string,
  params: TriggerAggregationParams,
): Promise<TriggerAggregationResult> {
  const endpoint =
    params.type === "entitlements" ? "load-entitlements" : "load-accounts";
  const sp = new URLSearchParams();
  if (params.disableOptimization) sp.set("disableOptimization", "true");
  const qs = sp.toString();
  const path =
    `/v2025/sources/${encodeURIComponent(id)}/${endpoint}` +
    (qs ? `?${qs}` : "");

  const result = await sailpointFetch<unknown>(opts, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!result.ok) {
    const m = mapError(result.error);
    return { ok: false, status: m.status, message: m.message };
  }
  return { ok: true, taskId: extractTaskId(result.data) };
}

/**
 * Best-effort global account count, optionally narrowed by `filters`.
 *
 * Powers KPI cards on the Sources list (e.g. orphan accounts across the
 * whole tenant via `filters=uncorrelated eq true`). Returns `undefined`
 * on any failure so callers can render a "—" cell rather than poison
 * the strip with an error state.
 */
export async function countAccounts(
  opts: SailpointClientOptions,
  params: { filters?: string } = {},
): Promise<number | undefined> {
  const sp = new URLSearchParams();
  if (params.filters) sp.set("filters", params.filters);
  const qs = sp.toString();
  return sailpointCount(opts, `/v2025/accounts${qs ? `?${qs}` : ""}`);
}

/**
 * Entitlement count for a single source.
 *
 * Powers the Entitlements KPI on the Source detail 5-stat strip. Always
 * returns a `number` — failures (auth, network, 404, missing header,
 * non-2xx) collapse to `0` so the cell renders a value rather than poison
 * the strip with an error state. Use a dedicated health probe if you need
 * to distinguish "zero entitlements" from "couldn't ask".
 *
 * Issues a single `GET /v2025/entitlements?filters=source.id eq "{id}"
 * &count=true&limit=1` and reads the `X-Total-Count` response header via
 * the shared `sailpointCount` helper.
 */
export async function countEntitlements(
  opts: SailpointClientOptions,
  params: { sourceId: string },
): Promise<number> {
  const escaped = params.sourceId.replace(/"/g, '\\"');
  const sp = new URLSearchParams();
  sp.set("filters", `source.id eq "${escaped}"`);
  const total = await sailpointCount(
    opts,
    `/v2025/entitlements?${sp.toString()}`,
  );
  return total ?? 0;
}

/**
 * The load endpoints return shapes that vary by ISC version: sometimes
 * `{ task: { id } }`, sometimes `{ id }`, sometimes `{ taskId }`, sometimes
 * an empty 202. Lenient extraction keeps the contract stable.
 */
function extractTaskId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.taskId === "string") return obj.taskId;
  if (typeof obj.id === "string") return obj.id;
  const task = obj.task;
  if (task && typeof task === "object" && "id" in task) {
    const id = (task as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

/**
 * Per-source schema mapping entry — pairs an account-schema attribute with
 * its provisioning target. Permissive shape: the v2025 public spec doesn't
 * document this endpoint under this path, and the response varies by
 * connector, so we expose the fields the Provisioning tab actually reads
 * plus a passthrough for the rest.
 */
export type SchemaMappingEntry = {
  /** Account attribute name on the source schema. */
  name?: string;
  /** Display label for the attribute (when the connector provides one). */
  displayName?: string | null;
  /** Target identity attribute name, when mapped. */
  target?: string | null;
  /** Source attribute the target is mapped from, when set. */
  source?: string | null;
  /** Whether the mapping is currently enabled. */
  enabled?: boolean;
  /** Whether the attribute is required by the provisioning policy. */
  required?: boolean;
  /** Connector-extra fields surface here. */
  [key: string]: unknown;
};

/**
 * Schema-mappings payload returned by
 * `GET /v2025/sources/{id}/accounts/schema-mappings`.
 *
 * Permissive top-level shape — `attributes` carries the per-attribute
 * mapping list (the field name most ISC connectors use), and the rest is
 * passthrough so we don't fight the connector-specific extras.
 */
export type SchemaMappings = {
  id?: string;
  name?: string | null;
  /** Reference to the source the mappings apply to, when echoed back. */
  source?: SourceRef | null;
  /** Per-attribute mappings — primary payload consumers iterate over. */
  attributes?: SchemaMappingEntry[];
  /** Connector-extra fields surface here. */
  [key: string]: unknown;
};

/**
 * Single attribute-assignment row in a correlation config (mirrors the
 * `CorrelationConfig.attributeAssignments[]` shape in the v2025 spec).
 */
export type CorrelationAttributeAssignment = {
  /** Account attribute property name (left-hand side of the match rule). */
  property?: string;
  /** Identity attribute the property is matched against. */
  value?: string;
  /** Match operation — ISC currently only emits `EQ`. */
  operation?: "EQ" | string;
  /** Whether this is a complex (multi-step) assignment. */
  complex?: boolean;
  /** Whether the comparison ignores case. */
  ignoreCase?: boolean;
  /** Substring match mode for non-exact matches. */
  matchMode?: "ANYWHERE" | "START" | "END" | string;
  /** Filter expression (when complex). */
  filterString?: string;
};

/**
 * Source correlation configuration returned by
 * `GET /v2025/sources/{id}/account-correlations-config`.
 *
 * Shape mirrors the public v2025 `CorrelationConfig` schema — non-authoritative
 * sources may not have a correlation config yet, hence the 404 → null
 * pattern at the factory level.
 */
export type CorrelationConfig = {
  /** Correlation configuration ID. */
  id?: string | null;
  /** Human label (typically `Source [name] Account Correlation`). */
  name?: string | null;
  /** Per-attribute correlation rules. */
  attributeAssignments?: CorrelationAttributeAssignment[] | null;
  /** Passthrough for any connector-specific extras. */
  [key: string]: unknown;
};

/**
 * `GET /v2025/sources/{id}/accounts/schema-mappings`.
 *
 * Returns the per-source schema mapping payload used by the Provisioning
 * tab. Two behaviours diverge from the rest of the factory:
 *
 *  - 404 → `null` (not all sources have schema mappings — non-authoritative
 *    or freshly-created sources commonly return 404 here).
 *  - Any other non-2xx → throws, so callers can render a dedicated error
 *    state rather than burying the failure in a permissive payload.
 *
 * The response shape is permissive (`SchemaMappings`) because the v2025
 * spec doesn't pin the body for this path and ISC returns connector-specific
 * extras alongside the canonical `attributes` array.
 */
export async function getSchemaMappings(
  opts: SailpointClientOptions,
  sourceId: string,
): Promise<SchemaMappings | null> {
  const path = `/v2025/sources/${encodeURIComponent(sourceId)}/accounts/schema-mappings`;
  const result = await sailpointFetch<SchemaMappings>(opts, path);
  if (result.ok) return result.data ?? null;
  if (result.error.kind === "api_error" && result.error.status === 404) {
    return null;
  }
  throw new Error(
    result.error.kind === "api_error"
      ? `Failed to fetch schema mappings (HTTP ${result.error.status}): ${result.error.message}`
      : result.error.kind === "auth_failed"
        ? result.error.message
        : "Not connected to SailPoint.",
  );
}

/**
 * `GET /v2025/sources/{id}/account-correlations-config`.
 *
 * Returns the correlation rules used to attach incoming accounts to
 * identities. Non-authoritative sources may have no config — those return
 * 404 here, surfaced as `null` so the Provisioning tab can render a
 * "no correlation configured" empty state.
 *
 * Other failures throw — same rationale as `getSchemaMappings`.
 */
export async function getCorrelationConfig(
  opts: SailpointClientOptions,
  sourceId: string,
): Promise<CorrelationConfig | null> {
  const path = `/v2025/sources/${encodeURIComponent(sourceId)}/account-correlations-config`;
  const result = await sailpointFetch<CorrelationConfig>(opts, path);
  if (result.ok) return result.data ?? null;
  if (result.error.kind === "api_error" && result.error.status === 404) {
    return null;
  }
  throw new Error(
    result.error.kind === "api_error"
      ? `Failed to fetch correlation config (HTTP ${result.error.status}): ${result.error.message}`
      : result.error.kind === "auth_failed"
        ? result.error.message
        : "Not connected to SailPoint.",
  );
}
