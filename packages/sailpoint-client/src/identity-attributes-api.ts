import {
  sailpointFetch,
  type SailpointClientOptions,
  type SailpointFetchError,
} from "./client";

/**
 * Identity Attributes API factory (v0).
 *
 * Four pure functions covering the read surface needed by the admin
 * Identity Attributes list + detail experience, plus two cross-ref
 * helpers (transforms / identity profiles). Mirrors the shape of
 * `sources-api.ts` / `identities-api.ts`:
 *  - takes `SailpointClientOptions` explicitly (no DB / no auth state),
 *  - returns discriminated `{ ok }` results with `status` on failure so
 *    callers can branch on 403 without parsing a generic Error.
 *
 * The cross-ref walker stays in this package (per issue #145) but only
 * depends on a minimal `TransformLike` contract redeclared locally
 * (peer-dependency style) so `@simplified-identity/sailpoint-client`
 * keeps zero workspace deps on `@simplified-identity/transforms`.
 */

// ============================================================
// Types
// ============================================================

/**
 * Source binding entry on an identity attribute. ISC returns one of two
 * shapes here — a direct source/attr mapping (`type: "Standard"` with
 * `properties.sourceName` + `properties.attributeName`) or a rule
 * binding (`type: "rule"` with `properties.rule` ref). Kept loose: the
 * UI casts at point of use rather than declaring an exhaustive union.
 */
export type IdentityAttributeSource = {
  type: string;
  properties?: Record<string, unknown>;
};

/**
 * Row shape returned by `GET /v2025/identity-attributes`. The same payload
 * is returned by `GET /v2025/identity-attributes/{name}` — the detail
 * endpoint isn't richer in v2025, just narrower.
 */
export type IdentityAttributeSummary = {
  name: string;
  displayName?: string | null;
  /** "string" | "boolean" | "int" | "date" | etc. */
  type?: string | null;
  multi?: boolean;
  searchable?: boolean;
  /** OOTB system attribute (cannot be deleted). */
  system?: boolean;
  /**
   * Computed flag — `true` when the attribute is OOTB / cannot be deleted.
   * Surfaced explicitly so the UI can split Standard vs Custom without a
   * second lookup. Falls back to `system` when the API omits the flag.
   */
  standard?: boolean;
  sources?: IdentityAttributeSource[];
};

/** Detail response — same shape as the list rows. */
export type IdentityAttributeDetail = IdentityAttributeSummary;

/**
 * Wider identity-profile shape needed by the cross-ref walker. Declared
 * locally (not imported from `identities-api`) because
 * `IdentityProfileSummary` is intentionally narrow over there — extending
 * that type to expose `identityAttributeConfig` would lie about what its
 * consumers actually use.
 */
type IdentityProfileWithAttributeConfig = {
  id: string;
  name?: string;
  identityAttributeConfig?: {
    attributeTransforms?: Array<{
      identityAttributeName?: string;
      transformDefinition?: unknown;
    }>;
  };
};

/**
 * Minimal transform contract consumed by the cross-ref walker.
 * Peer-dependency-style: this matches `TransformLike` exported by
 * `@simplified-identity/transforms` without taking a workspace dep on it.
 */
type TransformLike = {
  id: string;
  name: string;
  attributes?: Record<string, unknown>;
};

/**
 * One usage of an identity attribute inside a transform definition.
 * The canonical SailPoint reference pattern is:
 *   { type: "identityAttribute", attributes: { name: "<attrName>" } }
 */
export type AttributeUsageInTransform = {
  transformId: string;
  transformName: string;
  /** Dotted path inside `transform.attributes` where the reference was found. */
  attributePath: string;
  /** Node `type` that matched (e.g. "identityAttribute"). */
  nodeType: string;
};

/**
 * One mapping of an identity attribute inside an identity profile's
 * `identityAttributeConfig.attributeTransforms`. The matched
 * `transformDefinition` (inline payload or `{type:"reference",...}`) is
 * returned as-is; consumers decide how to render.
 */
export type AttributeUsageInIdentityProfile = {
  profileId: string;
  profileName: string;
  identityAttributeName: string;
  transformDefinition: unknown;
};

export type ListIdentityAttributesParams = {
  /**
   * Free-text filter applied client-side on `name` / `displayName`.
   * `/v2025/identity-attributes` doesn't accept SCIM filter expressions
   * (returns 400 on `filters=`), so we filter in-process. A typical
   * tenant carries 20–60 rows — cheap.
   */
  filters?: string;
  /** Restrict to standard (system) or custom (non-system). Defaults to "all". */
  scope?: "standard" | "custom" | "all";
};

/**
 * Result shapes — duplicated locally (mirrors sources-api / identities-api
 * / transforms-api) so the module stays self-contained.
 */
export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export type ListResult<T> =
  | { ok: true; data: T[] }
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

function normalizeStandardFlag(
  row: IdentityAttributeSummary,
): IdentityAttributeSummary {
  return { ...row, standard: row.standard ?? row.system ?? false };
}

// ============================================================
// Functions
// ============================================================

/**
 * `GET /v2025/identity-attributes` — list page (read-only v0).
 *
 * Returns BOTH standard and custom attributes. Each row carries a
 * `standard: boolean` flag (falls back to `system` when the API omits
 * it) so the UI can split sections without a second call.
 *
 * Client-side filtering on `filters` (free-text) and `scope` — see the
 * `ListIdentityAttributesParams` docstring for why.
 */
export async function listIdentityAttributes(
  opts: SailpointClientOptions,
  params: ListIdentityAttributesParams = {},
): Promise<ListResult<IdentityAttributeSummary>> {
  const result = await sailpointFetch<IdentityAttributeSummary[]>(
    opts,
    "/v2025/identity-attributes",
  );
  if (!result.ok) return mapError(result.error);

  let rows = result.data.map(normalizeStandardFlag);

  if (params.scope === "standard") {
    rows = rows.filter((r) => r.standard === true);
  } else if (params.scope === "custom") {
    rows = rows.filter((r) => r.standard !== true);
  }

  if (params.filters && params.filters.trim()) {
    const needle = params.filters.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        (r.displayName ?? "").toLowerCase().includes(needle),
    );
  }

  return { ok: true, data: rows };
}

/**
 * `GET /v2025/identity-attributes/{name}` — detail page.
 *
 * Returns the full attribute object including `sources` mapping (which
 * source/rule populates the value) and any default transform reference.
 */
export async function getIdentityAttribute(
  opts: SailpointClientOptions,
  name: string,
): Promise<FetchResult<IdentityAttributeDetail>> {
  const result = await sailpointFetch<IdentityAttributeDetail>(
    opts,
    `/v2025/identity-attributes/${encodeURIComponent(name)}`,
  );
  if (!result.ok) return mapError(result.error);
  return { ok: true, data: normalizeStandardFlag(result.data) };
}

/**
 * Cross-ref helper — walks every transform on the tenant and emits one
 * entry per node that references `attributeName`. The canonical SailPoint
 * pattern is `{ type: "identityAttribute", attributes: { name: "<attr>" } }`.
 *
 * Match path tracking mirrors the walker in
 * `packages/transforms/src/usages.ts` so the two stay legible side by side.
 *
 * Scope note (v0): only the `identityAttribute` source node is matched.
 * Other reference flavours (`accountAttribute` mappings whose downstream
 * output happens to feed `attributeName`, custom rules) require richer
 * semantic resolution and are out of scope for the v0 read surface.
 */
export async function getAttributeUsageInTransforms(
  opts: SailpointClientOptions,
  attributeName: string,
): Promise<ListResult<AttributeUsageInTransform>> {
  const result = await sailpointFetch<TransformLike[]>(
    opts,
    "/v2025/transforms?limit=250",
  );
  if (!result.ok) return mapError(result.error);

  const out: AttributeUsageInTransform[] = [];
  for (const t of result.data) {
    if (!t.attributes) continue;
    walkForIdentityAttribute(t.attributes, [], attributeName, t, out);
  }
  return { ok: true, data: out };
}

/**
 * `GET /v2025/identity-profiles` — emits one entry per
 * `identityAttributeConfig.attributeTransforms[]` row whose
 * `identityAttributeName` matches `attributeName`. The mapped
 * `transformDefinition` (inline payload or `{ type: "reference", ... }`)
 * is returned as-is so consumers can render either.
 *
 * The listing endpoint already includes the full `identityAttributeConfig`
 * payload — no need to fetch each profile individually.
 */
export async function getAttributeUsageInIdentityProfiles(
  opts: SailpointClientOptions,
  attributeName: string,
): Promise<ListResult<AttributeUsageInIdentityProfile>> {
  const result = await sailpointFetch<IdentityProfileWithAttributeConfig[]>(
    opts,
    "/v2025/identity-profiles?limit=250",
  );
  if (!result.ok) return mapError(result.error);

  const out: AttributeUsageInIdentityProfile[] = [];
  for (const profile of result.data) {
    const entries = profile.identityAttributeConfig?.attributeTransforms ?? [];
    for (const entry of entries) {
      if (entry.identityAttributeName !== attributeName) continue;
      out.push({
        profileId: profile.id,
        profileName: profile.name ?? "(unnamed identity profile)",
        identityAttributeName: attributeName,
        transformDefinition: entry.transformDefinition,
      });
    }
  }
  return { ok: true, data: out };
}

// ============================================================
// Internal walkers
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walkForIdentityAttribute(
  node: unknown,
  pathSegments: string[],
  attributeName: string,
  transform: TransformLike,
  out: AttributeUsageInTransform[],
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walkForIdentityAttribute(
        node[i],
        [...pathSegments, `[${i}]`],
        attributeName,
        transform,
        out,
      );
    }
    return;
  }
  if (!isRecord(node)) return;

  if (
    node.type === "identityAttribute" &&
    isRecord(node.attributes) &&
    node.attributes.name === attributeName
  ) {
    out.push({
      transformId: transform.id,
      transformName: transform.name,
      attributePath:
        pathSegments.length > 0
          ? `attributes.${pathSegments.join(".")}`
          : "attributes.(root)",
      nodeType: "identityAttribute",
    });
  }

  for (const [key, value] of Object.entries(node)) {
    walkForIdentityAttribute(
      value,
      [...pathSegments, key],
      attributeName,
      transform,
      out,
    );
  }
}

// ============================================================
// Batch snapshot — "unused" detection (issue #206)
// ============================================================

/**
 * Per-attribute usage roll-up across identity profiles + transforms.
 *
 * `unused === true` when an attribute is consumed by **zero** identity
 * profile mappings AND **zero** transform `identityAttribute` source
 * nodes. The two counts are surfaced separately so the UI can disambiguate
 * "no profile maps it" from "no transform reads it" if it ever wants to.
 */
export type IdentityAttributeUsageSnapshot = {
  attributeName: string;
  identityProfilesCount: number;
  transformsCount: number;
  unused: boolean;
};

/**
 * Batch version of `getAttributeUsageInIdentityProfiles` +
 * `getAttributeUsageInTransforms`, designed for the list page server
 * render. Issues exactly **3 network calls** for the whole tenant:
 *
 * 1. `GET /v2025/identity-attributes` — the universe of attribute names.
 * 2. `GET /v2025/identity-profiles?limit=250` — walk
 *    `identityAttributeConfig.attributeTransforms[]`, increment the
 *    profile-count of each `identityAttributeName` referenced.
 * 3. `GET /v2025/transforms?limit=250` — walk each transform's
 *    `attributes` JSON tree for `{ type:"identityAttribute",
 *    attributes:{name} }` nodes; increment the transform-count of the
 *    referenced `name`.
 *
 * Counts are **occurrences**, not distinct containers — if a single
 * profile maps an attribute twice (legal, e.g. via two source bindings),
 * it counts as 2. The KPI / row badge only cares about `unused`, so the
 * distinction doesn't matter for the v1 surface, and it keeps the walker
 * symmetric with the per-attribute helpers above (which also emit one
 * entry per reference, not one per container).
 *
 * Any attribute returned by `/identity-attributes` that doesn't appear
 * in either accumulator surfaces as `unused: true` with both counts at 0.
 *
 * If the underlying transform call fails, we still return a snapshot
 * based on profile counts only — but flag every zero-profile row as
 * `unused: false` to avoid false positives (better to under-flag than
 * over-flag). Same symmetry for the profile call. If `/identity-attributes`
 * itself fails the whole snapshot returns the error.
 */
export async function getIdentityAttributesUsageSnapshot(
  opts: SailpointClientOptions,
): Promise<ListResult<IdentityAttributeUsageSnapshot>> {
  const [attrsRes, profilesRes, transformsRes] = await Promise.all([
    sailpointFetch<IdentityAttributeSummary[]>(opts, "/v2025/identity-attributes"),
    sailpointFetch<IdentityProfileWithAttributeConfig[]>(
      opts,
      "/v2025/identity-profiles?limit=250",
    ),
    sailpointFetch<TransformLike[]>(opts, "/v2025/transforms?limit=250"),
  ]);

  if (!attrsRes.ok) return mapError(attrsRes.error);

  // Profile-side accumulator: identityAttributeName -> count.
  const profileCounts = new Map<string, number>();
  if (profilesRes.ok) {
    for (const profile of profilesRes.data) {
      const entries = profile.identityAttributeConfig?.attributeTransforms ?? [];
      for (const entry of entries) {
        if (!entry.identityAttributeName) continue;
        profileCounts.set(
          entry.identityAttributeName,
          (profileCounts.get(entry.identityAttributeName) ?? 0) + 1,
        );
      }
    }
  }

  // Transform-side accumulator: identityAttribute.name -> count.
  const transformCounts = new Map<string, number>();
  if (transformsRes.ok) {
    for (const t of transformsRes.data) {
      if (!t.attributes) continue;
      walkTransformForIdentityAttributeRefs(t.attributes, transformCounts);
    }
  }

  // Track whether downstream calls succeeded so we don't flag attributes
  // as "unused" on the back of a failed sub-call (cf. the docstring).
  const profilesOk = profilesRes.ok;
  const transformsOk = transformsRes.ok;

  const rows: IdentityAttributeUsageSnapshot[] = attrsRes.data.map((attr) => {
    const profileCount = profileCounts.get(attr.name) ?? 0;
    const transformCount = transformCounts.get(attr.name) ?? 0;
    return {
      attributeName: attr.name,
      identityProfilesCount: profileCount,
      transformsCount: transformCount,
      unused:
        profilesOk &&
        transformsOk &&
        profileCount === 0 &&
        transformCount === 0,
    };
  });

  return { ok: true, data: rows };
}

/**
 * Walks any nested object/array tree under a transform's `attributes` and
 * increments the per-name counter for every `{ type: "identityAttribute",
 * attributes: { name } }` node it finds. Recursive over both objects and
 * arrays. Pure — mutates only the passed-in `counts` map.
 *
 * Kept narrow on purpose (no path tracking, no transform identity in the
 * output) — this walker exists for the batch snapshot's count-only need.
 * The richer per-attribute walker (`walkForIdentityAttribute`) above
 * remains the source of truth for surfaces that need the dotted path or
 * the originating transform.
 */
function walkTransformForIdentityAttributeRefs(
  node: unknown,
  counts: Map<string, number>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      walkTransformForIdentityAttributeRefs(item, counts);
    }
    return;
  }
  if (!isRecord(node)) return;

  if (
    node.type === "identityAttribute" &&
    isRecord(node.attributes) &&
    typeof node.attributes.name === "string"
  ) {
    const attrName = node.attributes.name;
    counts.set(attrName, (counts.get(attrName) ?? 0) + 1);
  }

  for (const value of Object.values(node)) {
    walkTransformForIdentityAttributeRefs(value, counts);
  }
}

// ============================================================
// Inverse cross-ref: identity attributes that reference a transform
// ============================================================

/**
 * One mapping inside an identity profile's
 * `identityAttributeConfig.attributeTransforms[]` whose `transformDefinition`
 * references the target transform via a `{ type: "reference", attributes: { id: "<name>" } }`
 * node. Used by the transform detail page to surface "who depends on me"
 * before the author changes or deletes the transform.
 */
export type IdentityAttributeReferencingTransform = {
  identityAttributeName: string;
  profileId: string;
  profileName: string;
};

/**
 * `GET /v2025/identity-profiles` — emits one entry per
 * `identityAttributeConfig.attributeTransforms[]` row whose
 * `transformDefinition` contains a `{ type: "reference", attributes: { id: "<transformName>" } }`
 * node anywhere in its tree.
 *
 * This is the inverse of `getAttributeUsageInIdentityProfiles`: that helper
 * takes an identity attribute name and lists the profiles mapping it; this
 * one takes a transform name and lists the (profile, identityAttribute) pairs
 * that invoke it via `reference`.
 *
 * The walker mirrors `walkForIdentityAttribute` but matches the
 * `{ type: "reference", attributes: { id } }` shape — ISC keys named
 * transforms by `name` in the `reference.attributes.id` slot (the field is
 * called `id` but holds the transform name; the API normalises it as such).
 */
export async function getIdentityAttributesReferencingTransform(
  opts: SailpointClientOptions,
  transformName: string,
): Promise<ListResult<IdentityAttributeReferencingTransform>> {
  const result = await sailpointFetch<IdentityProfileWithAttributeConfig[]>(
    opts,
    "/v2025/identity-profiles?limit=250",
  );
  if (!result.ok) return mapError(result.error);

  const out: IdentityAttributeReferencingTransform[] = [];
  for (const profile of result.data) {
    const entries = profile.identityAttributeConfig?.attributeTransforms ?? [];
    for (const entry of entries) {
      if (!entry.identityAttributeName) continue;
      const found = walkForTransformReference(
        entry.transformDefinition,
        transformName,
      );
      if (found) {
        out.push({
          identityAttributeName: entry.identityAttributeName,
          profileId: profile.id,
          profileName: profile.name ?? "(unnamed identity profile)",
        });
      }
    }
  }
  return { ok: true, data: out };
}

/**
 * Returns `true` as soon as a `{ type: "reference", attributes: { id: transformName } }`
 * node is found anywhere in the tree. We don't need full path tracking here
 * (unlike `walkForIdentityAttribute`) — the consumer only renders the
 * (attribute, profile) pair, not the inner JSON path.
 */
function walkForTransformReference(
  node: unknown,
  transformName: string,
): boolean {
  if (Array.isArray(node)) {
    for (const item of node) {
      if (walkForTransformReference(item, transformName)) return true;
    }
    return false;
  }
  if (!isRecord(node)) return false;

  if (
    node.type === "reference" &&
    isRecord(node.attributes) &&
    node.attributes.id === transformName
  ) {
    return true;
  }

  for (const value of Object.values(node)) {
    if (walkForTransformReference(value, transformName)) return true;
  }
  return false;
}

// ============================================================
// Value distribution — Sample values tab (issue #147)
// ============================================================

/**
 * One bucket of `getIdentityAttributeValueDistribution`.
 */
export type IdentityAttributeValueBucket = {
  value: string;
  count: number;
};

export type GetIdentityAttributeValueDistributionParams = {
  /**
   * Top N distinct values to return. ISC aggregations are server-paginated
   * via `size` only — there's no `from` offset on aggregation buckets, so
   * anything beyond `limit` is silently truncated. Default 20.
   */
  limit?: number;
};

type SearchAggregationsResponse = {
  aggregations?: {
    [key: string]: {
      buckets?: Array<{ key: string; doc_count: number }>;
    };
  };
};

/**
 * `POST /v2025/search` (indices: identities) with a terms aggregation on
 * `attributes.<name>.exact` — the keyword sub-field used by ISC for
 * exact-match bucketing. Returns the top N distinct values with their
 * identity counts, sorted by count desc.
 *
 * Why `.exact`: ISC indexes identity attributes under `attributes.<name>`
 * with a `.exact` keyword sub-field. The analyzed `attributes.<name>` path
 * tokenises (would split "Engineering Ops" into "Engineering" + "Ops"
 * buckets). The `.exact` sub-field buckets per full value, which is what
 * we want for a value distribution. If the attribute lacks `.exact` on a
 * given tenant ISC returns 0 buckets — accept the empty result rather
 * than failing hard.
 *
 * Aggregations don't support cursor pagination (the search API exposes
 * `from`/`size` on hits, not on bucket lists). When the result list is
 * exactly `limit` rows long, the consumer should surface "+ N more" or a
 * similar truncation note — we can't know the true cardinality without a
 * separate cardinality aggregation. Default `limit: 20`.
 */
export async function getIdentityAttributeValueDistribution(
  opts: SailpointClientOptions,
  attributeName: string,
  params: GetIdentityAttributeValueDistributionParams = {},
): Promise<ListResult<IdentityAttributeValueBucket>> {
  const limit = params.limit ?? 20;
  const aggregationField = `attributes.${attributeName}.exact`;
  const body = {
    indices: ["identities"],
    queryType: "SAILPOINT",
    query: { query: "*" },
    aggregationsDsl: {
      values: {
        terms: {
          field: aggregationField,
          size: limit,
        },
      },
    },
  };

  const res = await fetch(`${opts.baseUrl}/v2025/search?limit=0`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
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

  try {
    const data = (await res.json()) as SearchAggregationsResponse;
    const buckets = data.aggregations?.values?.buckets ?? [];
    const rows: IdentityAttributeValueBucket[] = buckets
      .map((b) => ({ value: String(b.key), count: Number(b.doc_count) }))
      .sort((a, b) => b.count - a.count);
    return { ok: true, data: rows };
  } catch (e) {
    return {
      ok: false,
      status: res.status,
      message: `Couldn't parse SailPoint response: ${(e as Error).message}`,
    };
  }
}

// ============================================================
// Drift detection — null-population per attribute (issue #207)
// ============================================================

/**
 * Drift tier — derived from `nullRatio` per the ADR
 * (`vault/Projects/Simplified Identity/2026-05-14-identity-attribute-drift-strategy.md`).
 */
export type DriftTier = "ok" | "warning" | "danger";

export type AttributeDriftInput = {
  attributeName: string;
  /**
   * Identity profile IDs whose `identityAttributeConfig` maps the
   * attribute. The drift `total` denominator is restricted to identities
   * IN these profiles (per Q3 of the ADR — scoped denominator). When
   * empty, drift is meaningless for the attribute (it's "unused", not
   * drifting) and the helper short-circuits to `tier: "ok"`.
   */
  profileIds: string[];
};

export type AttributeDriftResult = {
  attributeName: string;
  populatedCount: number;
  totalCount: number;
  /** 0..1 — `1 - populatedCount / totalCount`, or 0 if `totalCount === 0`. */
  nullRatio: number;
  tier: DriftTier;
  mappingProfileIds: string[];
};

/**
 * Pure threshold function — exported separately so the UI / tests can
 * derive tier without going through the network helper.
 *
 * Thresholds locked by the ADR: warning `[0.05, 0.20]`, danger `> 0.20`,
 * everything else `ok`. NaN / negative values clamp to `ok` (defensive).
 */
export function deriveDriftTier(nullRatio: number): DriftTier {
  if (!Number.isFinite(nullRatio) || nullRatio <= 0) return "ok";
  if (nullRatio > 0.2) return "danger";
  if (nullRatio >= 0.05) return "warning";
  return "ok";
}

/**
 * Build the SailPoint search query body shared by both calls. Restricts
 * to the `identities` index, filtered to the supplied identity profiles
 * via `identityProfile.id` (the field surfaced on identity docs by ISC).
 * Optionally adds an `_exists_:attributes.<name>` filter to count
 * "populated" identities only.
 *
 * Pagination note: per `/v2025/search` quirk (memory note
 * `feedback_sail_search_pagination`), the `from`/`size` body fields are
 * ignored. For our use case we only need the response `total`, so we
 * set `limit: 0` via the URL (the only mechanism that takes effect).
 */
function buildDriftSearchBody(
  profileIds: string[],
  options: { requirePopulated: boolean; attributeName?: string },
) {
  const profileClause = profileIds
    .map((id) => `"${id.replace(/"/g, '\\"')}"`)
    .join(" OR ");
  const baseScope = `identityProfile.id:(${profileClause})`;
  const fullQuery = options.requirePopulated
    ? `${baseScope} AND _exists_:attributes.${options.attributeName}`
    : baseScope;
  return {
    indices: ["identities"],
    queryType: "SAILPOINT",
    query: { query: fullQuery },
  };
}

/**
 * `total` is returned by ISC on the response root or in a `.meta` block
 * depending on tenant version. The `X-Total-Count` header is the most
 * reliable surface — fall back to body fields when absent.
 */
async function searchTotalCount(
  opts: SailpointClientOptions,
  body: unknown,
): Promise<{ ok: true; total: number } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${opts.baseUrl}/v2025/search?limit=0&count=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
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

  const header = res.headers.get("x-total-count");
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n)) return { ok: true, total: n };
  }

  // Fallback: parse the body. With `limit=0` the API returns an empty
  // hits array; the total may live on `.meta.total` or just be the
  // length of `hits` (which would be 0 — not useful, but defensive).
  try {
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) return { ok: true, total: data.length };
    if (data && typeof data === "object") {
      const meta = (data as { meta?: { total?: unknown } }).meta;
      if (meta && typeof meta.total === "number") {
        return { ok: true, total: meta.total };
      }
    }
    return { ok: true, total: 0 };
  } catch {
    return { ok: true, total: 0 };
  }
}

/**
 * Compute drift for one identity attribute. Caller provides the list of
 * identity profile IDs that map the attribute (typically derived once
 * from the usage snapshot to avoid re-walking profiles per attribute).
 *
 * Issues 2 `POST /v2025/search?limit=0` calls:
 *   - populated : `identityProfile.id:(<ids>) AND _exists_:attributes.<name>`
 *   - total     : `identityProfile.id:(<ids>)`
 *
 * Returns `tier: "ok"` and zero counts when `profileIds.length === 0`
 * (the attribute isn't mapped — that's the Unused signal, not drift).
 *
 * Cost: 2 network calls per call site. The list refresh calls this
 * once per mapped attribute (bounded ~50–100 on a typical tenant).
 */
export async function computeAttributeDrift(
  opts: SailpointClientOptions,
  input: AttributeDriftInput,
): Promise<FetchResult<AttributeDriftResult>> {
  if (input.profileIds.length === 0) {
    return {
      ok: true,
      data: {
        attributeName: input.attributeName,
        populatedCount: 0,
        totalCount: 0,
        nullRatio: 0,
        tier: "ok",
        mappingProfileIds: [],
      },
    };
  }

  const [totalRes, populatedRes] = await Promise.all([
    searchTotalCount(
      opts,
      buildDriftSearchBody(input.profileIds, { requirePopulated: false }),
    ),
    searchTotalCount(
      opts,
      buildDriftSearchBody(input.profileIds, {
        requirePopulated: true,
        attributeName: input.attributeName,
      }),
    ),
  ]);

  if (!totalRes.ok) return totalRes;
  if (!populatedRes.ok) return populatedRes;

  const totalCount = totalRes.total;
  const populatedCount = Math.min(populatedRes.total, totalCount);
  const nullRatio =
    totalCount === 0 ? 0 : 1 - populatedCount / totalCount;
  const tier = deriveDriftTier(nullRatio);

  return {
    ok: true,
    data: {
      attributeName: input.attributeName,
      populatedCount,
      totalCount,
      nullRatio,
      tier,
      mappingProfileIds: [...input.profileIds],
    },
  };
}

/**
 * Cross-ref helper — emits a per-attribute map of identity profile IDs
 * that map the attribute. Reuses the same listing endpoint as
 * `getIdentityAttributesUsageSnapshot` so the drift refresh can build
 * its mapping without re-fetching identity-profiles.
 *
 * Returned in stable order — profile order from the listing API,
 * deduplicated (a profile mapping the attribute twice through two
 * source bindings still counts as one for drift's denominator scope).
 */
export async function getAttributeProfileMapping(
  opts: SailpointClientOptions,
): Promise<ListResult<{ attributeName: string; profileIds: string[] }>> {
  const result = await sailpointFetch<IdentityProfileWithAttributeConfig[]>(
    opts,
    "/v2025/identity-profiles?limit=250",
  );
  if (!result.ok) return mapError(result.error);

  const byAttr = new Map<string, Set<string>>();
  for (const profile of result.data) {
    const entries = profile.identityAttributeConfig?.attributeTransforms ?? [];
    for (const entry of entries) {
      if (!entry.identityAttributeName) continue;
      let set = byAttr.get(entry.identityAttributeName);
      if (!set) {
        set = new Set();
        byAttr.set(entry.identityAttributeName, set);
      }
      set.add(profile.id);
    }
  }

  const out = Array.from(byAttr.entries()).map(([attributeName, ids]) => ({
    attributeName,
    profileIds: Array.from(ids),
  }));
  return { ok: true, data: out };
}
