import type { IdentitySearchHit } from "@simplified-identity/sailpoint-client";

export type IdentityRow = {
  id: string;
  name: string;
  email: string | null;
  profileName: string | null;
  lifecycleState: string | null;
  manager: { id: string; name: string } | null;
  modified: string | null;
  department: string | null;
  jobTitle: string | null;
  riskScore: string | null;
  accountCount: number;
  entitlementCount: number;
  isExternal: boolean;
};

const CONTRACTOR_PROFILE_PATTERNS = /contractor|external|prestataire|\bext\b/i;

function isContractorProfile(name: string | null | undefined): boolean {
  if (!name) return false;
  return CONTRACTOR_PROFILE_PATTERNS.test(name);
}

export function toRow(hit: IdentitySearchHit): IdentityRow {
  const attrs = (hit.attributes ?? {}) as Record<string, unknown>;
  const department =
    typeof attrs.department === "string" ? (attrs.department as string) : null;
  const jobTitle =
    typeof attrs.jobTitle === "string" ? (attrs.jobTitle as string) : null;
  const riskRaw =
    typeof attrs.identityRiskScore === "string"
      ? (attrs.identityRiskScore as string).toLowerCase()
      : null;
  const attrType =
    typeof attrs.type === "string"
      ? (attrs.type as string).toLowerCase()
      : null;
  const profileName = hit.identityProfile?.name ?? null;
  const isExternal =
    attrType === "contractor" ||
    attrType === "external" ||
    isContractorProfile(profileName);

  const entitlementCount = Array.isArray(hit.access)
    ? hit.access.filter((a) => (a.type ?? "").toUpperCase() === "ENTITLEMENT")
        .length
    : 0;
  const accountCount = Array.isArray(hit.accounts) ? hit.accounts.length : 0;

  const manager = hit.manager
    ? {
        id: hit.manager.id ?? "",
        name: hit.manager.displayName ?? hit.manager.name ?? "Unknown",
      }
    : null;

  return {
    id: hit.id,
    name: hit.displayName ?? hit.name ?? hit.id,
    email: hit.email ?? null,
    profileName,
    lifecycleState: hit.lifecycleState?.stateName ?? null,
    manager: manager && manager.id ? manager : null,
    modified: hit.modified ?? null,
    department,
    jobTitle,
    riskScore: riskRaw,
    accountCount,
    entitlementCount,
    isExternal,
  };
}

export const IDENTITY_CSV_COLUMNS = [
  "id",
  "name",
  "email",
  "department",
  "jobTitle",
  "manager",
  "lifecycleState",
  "riskScore",
  "accounts",
  "entitlements",
  "modified",
  "identityProfile",
  "external",
] as const;

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvHeaderLine(): string {
  return IDENTITY_CSV_COLUMNS.join(",");
}

export function csvLineFromRow(row: IdentityRow): string {
  return [
    row.id,
    row.name,
    row.email,
    row.department,
    row.jobTitle,
    row.manager?.name,
    row.lifecycleState,
    row.riskScore,
    row.accountCount,
    row.entitlementCount,
    row.modified,
    row.profileName,
    row.isExternal ? "true" : "false",
  ]
    .map(csvEscape)
    .join(",");
}

export function csvSerializeRows(rows: IdentityRow[]): string {
  const lines = [csvHeaderLine()];
  for (const r of rows) lines.push(csvLineFromRow(r));
  return lines.join("\r\n");
}
