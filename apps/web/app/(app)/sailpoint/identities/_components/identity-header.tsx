import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

import { AvatarInitials } from "./avatar-initials";
import { LifecyclePill } from "./lifecycle-pill";
import { ProcessIdentityButton } from "./process-button";
import { RiskPill } from "./risk-pill";

/**
 * Identity detail header.
 *
 * Layout follows the design mockup minus the actions that don't map to a
 * SailPoint primitive:
 *
 *  - `Edit` is dropped — identity attributes are computed from authoritative
 *    source data via transforms; any direct edit gets overwritten on the next
 *    identity process.
 *  - `Certify` is dropped — certifications in ISC are campaigns
 *    (`POST /v2025/campaigns`), not a per-identity one-click action.
 *  - `Re-aggregate` is replaced by `Process identity` because re-aggregation
 *    in SailPoint is per-source (not per-identity). The closest per-identity
 *    primitive is `POST /v2025/identities/process` — i.e. our existing
 *    `ProcessIdentityButton`.
 *
 * See ADR `vault/Projects/Simplified Identity/2026-05-12-identity-detail-redesign.md`.
 */

function pickAttr(
  attrs: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null {
  if (!attrs) return null;
  for (const key of keys) {
    const value = attrs[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

/**
 * Map a raw ISC risk signal to a Low/Medium/High/Critical bucket.
 *
 * ISC exposes risk through multiple channels depending on the tenant:
 *  - `attributes.cloudRiskScore` (numeric, 0..1000, the canonical Cloud
 *    Access Management score)
 *  - `attributes.riskScore` (numeric, same bucket on some tenants)
 *  - A pre-bucketed string like `low|medium|high|critical` on tenants that
 *    apply a server-side classification.
 *
 * Thresholds are tenant-configurable in real life — we use the default
 * SailPoint banding for v0. Tenant without any of these fields → no pill.
 */
function bucketRisk(
  attrs: Record<string, unknown> | null | undefined,
): string | null {
  if (!attrs) return null;
  const direct = pickAttr(attrs, ["riskLevel", "cloudRiskLevel"]);
  if (direct) return direct.toLowerCase();
  const candidates: unknown[] = [
    attrs.cloudRiskScore,
    attrs.riskScore,
    attrs.cloudComposedScore,
  ];
  for (const raw of candidates) {
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (Number.isFinite(n)) {
      if (n >= 750) return "critical";
      if (n >= 500) return "high";
      if (n >= 250) return "medium";
      return "low";
    }
  }
  return null;
}

function ProfilePill({ profile }: { profile: { name: string } | null }) {
  if (!profile?.name) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      {profile.name}
    </span>
  );
}

export function IdentityHeader({ identity }: { identity: IdentityDetail }) {
  const attrs = identity.attributes ?? {};
  const lcs = identity.lifecycleState?.stateName ?? null;
  const profile = identity.identityProfile ?? null;
  const risk = bucketRisk(attrs);

  const displayName =
    pickAttr(attrs, ["displayName"]) ?? identity.name ?? identity.id;
  const title = pickAttr(attrs, ["title", "jobTitle"]);
  const department = pickAttr(attrs, ["department", "cloudDepartment"]);
  const email = identity.emailAddress ?? pickAttr(attrs, ["email"]);
  const location = pickAttr(attrs, ["location", "country", "city", "office"]);
  const employeeType = pickAttr(attrs, ["employeeType", "identityType", "type"]);
  const employeeId = pickAttr(attrs, [
    "employeeNumber",
    "employeeId",
    "personalNumber",
  ]);

  const subtitle = [title, department].filter(Boolean).join(" · ");
  const tertiary = [email, location, employeeType, employeeId].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="flex min-w-0 items-start gap-4">
        <AvatarInitials
          name={displayName}
          className="h-12 w-12 shrink-0 text-base"
        />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <ProfilePill profile={profile} />
            <LifecyclePill state={lcs} />
            {risk && <RiskPill value={risk} />}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {tertiary.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground/80">
              {tertiary.map((value, i) => (
                <span key={`${value}-${i}`} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>·</span>}
                  <span>{value}</span>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:shrink-0">
        <ProcessIdentityButton
          id={identity.id}
          name={identity.name || identity.id}
        />
      </div>
    </div>
  );
}
