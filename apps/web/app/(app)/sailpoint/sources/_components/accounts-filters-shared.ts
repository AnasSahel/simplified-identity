/**
 * Neutral (non-"use client") module of option arrays + literal-union
 * types for the Accounts-tab filters on the source detail page. Lives
 * outside the "use client" files so the Server Component page can
 * import the constants without Next serializing them as client refs.
 * See feedback_next_rsc_client_exports.
 *
 * URL contract — all params use the `acc` prefix to avoid clashing with
 * the future schema-tab filters which will use their own prefix:
 *  - `?accq=...`        Free-text search (account name + nativeIdentity).
 *  - `?accstatus=...`   enabled | disabled
 *  - `?accorphan=...`   correlated | orphan
 *  - `?accmgr=...`      yes | no  (managerId present / absent)
 *  - `?accrefresh=...`  24h | 7d | 30d | older  (account.modified bucket)
 */

export const ACCOUNT_STATUS_OPTIONS = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
] as const;
export type AccountStatusFilterValue =
  (typeof ACCOUNT_STATUS_OPTIONS)[number]["value"];

export const ACCOUNT_CORRELATION_OPTIONS = [
  { value: "correlated", label: "Correlated" },
  { value: "orphan", label: "Orphan" },
] as const;
export type AccountCorrelationFilterValue =
  (typeof ACCOUNT_CORRELATION_OPTIONS)[number]["value"];

export const ACCOUNT_MANAGER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
export type AccountManagerFilterValue =
  (typeof ACCOUNT_MANAGER_OPTIONS)[number]["value"];

export const ACCOUNT_REFRESH_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "older", label: "Older than 30 days" },
] as const;
export type AccountRefreshFilterValue =
  (typeof ACCOUNT_REFRESH_OPTIONS)[number]["value"];

export const ACCOUNT_FILTER_PARAM_KEYS = [
  "accq",
  "accstatus",
  "accorphan",
  "accmgr",
  "accrefresh",
] as const;
