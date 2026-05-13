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
