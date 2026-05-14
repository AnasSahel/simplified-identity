/**
 * Best-effort extractors for fields buried inside `source.connectorAttributes`.
 *
 * Connector configs are per-connector and ISC has no canonical contract — keys
 * vary across `OpenConnector`, `DelimitedFile`, `WebServices`, vendor SaaS
 * connectors, etc. These helpers probe the most common keys used by the
 * connectors we've seen on tenants we operate, and return `null` when nothing
 * recognizable is found so callers can render `—`.
 *
 * Kept as a server/client-neutral module so it can be imported from server
 * components (e.g. `page.tsx`) and from client components (e.g. a future
 * "Edit configuration" drawer) without dragging `"use client"` boundaries.
 */

type Attrs = Record<string, unknown> | undefined | null;

function pickString(attrs: Attrs, keys: readonly string[]): string | null {
  if (!attrs) return null;
  for (const key of keys) {
    const v = attrs[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/**
 * Schedule cadence label parsed from common keys (`cron`, `schedule`,
 * `frequency`, `aggregationSchedule`). The real scheduling lives in the
 * `/v2025/schedules` collection — until that's wired we surface what the
 * connector exposes inline.
 */
export function parseScheduleFromConnectorAttributes(
  attrs: Attrs,
): string | null {
  return pickString(attrs, [
    "cron",
    "schedule",
    "frequency",
    "aggregationSchedule",
  ]);
}

/** Auth method label (`OAuth2`, `BasicAuth`, etc.) — best effort. */
export function parseAuthTypeFromConnectorAttributes(
  attrs: Attrs,
): string | null {
  return pickString(attrs, [
    "authenticationMethod",
    "authType",
    "auth_type",
    "authenticationType",
    "grant_type",
    "grantType",
  ]);
}

/** Tenant / instance URL (`host`, `url`, `instanceUrl`, …). */
export function parseTenantUrlFromConnectorAttributes(
  attrs: Attrs,
): string | null {
  return pickString(attrs, [
    "host",
    "url",
    "instanceUrl",
    "instance_url",
    "baseUrl",
    "base_url",
    "endpoint",
    "tenantUrl",
    "tenant_url",
    "domain",
  ]);
}

/**
 * OAuth scopes — connectors expose this as either a space-separated string,
 * a comma-separated string, or an array. Returns the normalized space-joined
 * form, or `null` if absent / empty.
 */
export function parseScopesFromConnectorAttributes(
  attrs: Attrs,
): string | null {
  if (!attrs) return null;
  const candidates = ["scopes", "scope", "oauthScopes", "oauth_scopes"];
  for (const key of candidates) {
    const v = attrs[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (Array.isArray(v)) {
      const items = v
        .filter((x): x is string => typeof x === "string" && x.length > 0)
        .map((s) => s.trim());
      if (items.length > 0) return items.join(" ");
    }
  }
  return null;
}

/**
 * Identity refresh policy — usually `refreshPolicy` or `identityRefreshPolicy`
 * if exposed at all (most connectors don't surface this inline).
 */
export function parseRefreshPolicyFromConnectorAttributes(
  attrs: Attrs,
): string | null {
  return pickString(attrs, [
    "identityRefreshPolicy",
    "refreshPolicy",
    "refresh_policy",
  ]);
}

/** Time zone if the connector exposes one (`timezone`, `tz`, …). */
export function parseTimeZoneFromConnectorAttributes(
  attrs: Attrs,
): string | null {
  return pickString(attrs, ["timezone", "timeZone", "tz", "scheduleTimezone"]);
}
