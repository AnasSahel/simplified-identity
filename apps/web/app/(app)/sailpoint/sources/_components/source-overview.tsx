import Link from "next/link";

import { Pill } from "@/components/ui/pill";
import type { SourceDetail } from "@/lib/sailpoint/sources-api";

import { OverviewActionStub } from "./overview-action-stub";
import {
  parseAuthTypeFromConnectorAttributes,
  parseRefreshPolicyFromConnectorAttributes,
  parseScheduleFromConnectorAttributes,
  parseScopesFromConnectorAttributes,
  parseTenantUrlFromConnectorAttributes,
  parseTimeZoneFromConnectorAttributes,
} from "./source-config-helpers";

/**
 * `<SourceOverview>` (issue #185) — 2-column overview of a source.
 *
 * Layout (`grid-template-columns: 2fr 1fr` on `lg+`):
 *   - Left  → Configuration card (kv list) + Health placeholder + Aggregation
 *             history placeholder. Health and Aggregation history land in
 *             Phase 3; placeholders are intentionally discreet, not
 *             aggressive disabled states.
 *   - Right → sticky side-stack: Identity profile, Schedule, Owners,
 *             Danger zone (action stubs disabled with tooltips).
 *
 * The previous KPI-grid (correlation rate, attribute coverage, accounts
 * total, since) was migrated to the 5-stat strip rendered above the tabs
 * (issue #184) — it is intentionally NOT re-rendered here.
 *
 * Server component: no client state, just composition. The danger-zone
 * action stubs that need a tooltip live in their own client island
 * (`<OverviewActionStub>`) so we don't have to wrap the entire page in
 * a `TooltipProvider`.
 */
export function SourceOverview({
  source,
  identityProfile,
}: {
  source: SourceDetail;
  identityProfile: IdentityProfileForOverview | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:gap-6">
      <div className="space-y-4 min-w-0">
        <ConfigurationCard source={source} />
        <HealthPlaceholderCard />
        <AggregationHistoryPlaceholderCard />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <IdentityProfileCard
          identityProfile={identityProfile}
          authoritative={Boolean(source.authoritative)}
        />
        <ScheduleCard source={source} />
        <OwnersCard source={source} />
        <DangerZoneCard />
      </aside>
    </div>
  );
}

// ============================================================
// Identity profile prop shape
// ============================================================

/**
 * Subset of `IdentityProfileSummary` (+ a couple of attempted enrichments)
 * that the side card actually renders. Kept narrow so `page.tsx` can shape
 * exactly what's needed and we don't import the `sailpoint-client` type
 * (which would couple the UI to the package surface).
 */
export type IdentityProfileForOverview = {
  id: string;
  name: string;
  /**
   * Identity count attached to this profile. Best effort — `/v2025/identity-profiles`
   * doesn't expose a count, and computing it would require an extra
   * `/v2025/identities` query per profile. `null` until that lookup is wired.
   */
  identitiesCount?: number | null;
  /**
   * Number of lifecycle states defined on the profile. Best effort — only
   * present if upstream fetched the full profile object (not the summary).
   */
  lifecycleStatesCount?: number | null;
  /** Default LCS technical name if surfaced by upstream. */
  defaultState?: string | null;
};

// ============================================================
// Cards — Left column
// ============================================================

function ConfigurationCard({ source }: { source: SourceDetail }) {
  const connectorLabel =
    [source.connectorName, source.connector].filter(Boolean).join(" · ") ||
    null;
  const authType = parseAuthTypeFromConnectorAttributes(
    source.connectorAttributes,
  );
  const tenantUrl = parseTenantUrlFromConnectorAttributes(
    source.connectorAttributes,
  );
  const scopes = parseScopesFromConnectorAttributes(source.connectorAttributes);
  const accountCorrelation = source.accountCorrelationConfig?.name ?? null;
  const managerCorrelation = source.managerCorrelationRule?.name ?? null;
  const refreshPolicy = parseRefreshPolicyFromConnectorAttributes(
    source.connectorAttributes,
  );

  const rows: KvRow[] = [
    { label: "Connector", value: connectorLabel },
    { label: "Auth type", value: authType },
    { label: "Tenant URL", value: tenantUrl, mono: true, truncate: true },
    { label: "Scopes", value: scopes, mono: true, wrap: true },
    { label: "Account correlation rule", value: accountCorrelation },
    { label: "Manager correlation", value: managerCorrelation },
    { label: "Identity refresh policy", value: refreshPolicy },
  ];

  return (
    <CardShell title="Configuration">
      <KvList rows={rows} />
    </CardShell>
  );
}

function HealthPlaceholderCard() {
  return (
    <CardShell title="Health" subtitle="Phase 3">
      <div className="px-4 py-6 si-body text-muted-foreground">
        Health monitoring lands in Phase 3.
      </div>
    </CardShell>
  );
}

function AggregationHistoryPlaceholderCard() {
  return (
    <CardShell title="Aggregation history" subtitle="Phase 3">
      <div className="px-4 py-6 si-body text-muted-foreground">
        Aggregation history lands in Phase 3.
      </div>
    </CardShell>
  );
}

// ============================================================
// Cards — Right column (side-stack)
// ============================================================

function IdentityProfileCard({
  identityProfile,
  authoritative,
}: {
  identityProfile: IdentityProfileForOverview | null;
  authoritative: boolean;
}) {
  if (!identityProfile) {
    return (
      <CardShell title="Identity profile">
        <div className="px-4 py-4 si-body text-muted-foreground">
          {authoritative
            ? "No identity profile resolved for this authoritative source."
            : "Not an authoritative source."}
        </div>
      </CardShell>
    );
  }

  const rows: KvRow[] = [
    {
      label: "Name",
      value: (
        <Link
          href={`/sailpoint/identity-profiles/${encodeURIComponent(identityProfile.id)}`}
          className="text-primary hover:underline"
        >
          {identityProfile.name}
        </Link>
      ),
    },
    {
      label: "Identities",
      value:
        identityProfile.identitiesCount === undefined ||
        identityProfile.identitiesCount === null
          ? null
          : String(identityProfile.identitiesCount),
    },
    {
      label: "Lifecycle states",
      value:
        identityProfile.lifecycleStatesCount === undefined ||
        identityProfile.lifecycleStatesCount === null
          ? null
          : String(identityProfile.lifecycleStatesCount),
    },
    {
      label: "Default state",
      value: identityProfile.defaultState ?? null,
    },
  ];

  return (
    <CardShell title="Identity profile">
      <KvList rows={rows} compact />
    </CardShell>
  );
}

function ScheduleCard({ source }: { source: SourceDetail }) {
  const cadence = parseScheduleFromConnectorAttributes(
    source.connectorAttributes,
  );
  const timeZone = parseTimeZoneFromConnectorAttributes(
    source.connectorAttributes,
  );

  const rows: KvRow[] = [
    { label: "Cadence", value: cadence, mono: Boolean(cadence) },
    { label: "Next run", value: null },
    { label: "Time zone", value: timeZone },
    { label: "Last 30 d", value: null },
  ];

  return (
    <CardShell title="Schedule">
      <KvList rows={rows} compact />
    </CardShell>
  );
}

function OwnersCard({ source }: { source: SourceDetail }) {
  const owner = source.owner ?? null;
  // ISC sometimes attaches a "managementWorkgroup"-like field on the source;
  // it isn't part of our typed surface, so we only render `cluster` for now.
  const cluster = source.cluster ?? null;

  const rows: KvRow[] = [
    {
      label: "Owner",
      value: owner ? (
        <Link
          href={`/sailpoint/identities/${encodeURIComponent(owner.id)}`}
          className="text-primary hover:underline"
        >
          {owner.name}
        </Link>
      ) : null,
    },
    {
      label: "Cluster",
      value: cluster?.name ?? null,
    },
  ];

  return (
    <CardShell title="Owners">
      <KvList rows={rows} compact />
    </CardShell>
  );
}

function DangerZoneCard() {
  return (
    <section className="overflow-hidden rounded-lg border border-destructive/40 bg-card">
      <header className="flex items-center justify-between border-b border-destructive/20 bg-destructive/5 px-4 py-2.5">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <Pill tone="warning">v2</Pill>
      </header>
      <div className="space-y-2 px-4 py-4">
        <OverviewActionStub
          label="Pause source"
          tooltip="Pause aggregation and provisioning. Coming in v2."
        />
        <OverviewActionStub
          label="Reset correlation"
          tooltip="Drop existing identity links and re-correlate. Coming in v2."
        />
        <OverviewActionStub
          label="Delete source"
          tooltip="Permanently remove this source from the tenant. Coming in v2."
          variant="destructive"
        />
      </div>
    </section>
  );
}

// ============================================================
// Local primitives
// ============================================================

type KvRow = {
  label: React.ReactNode;
  value: React.ReactNode | null;
  mono?: boolean;
  truncate?: boolean;
  wrap?: boolean;
};

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle ? (
          <span className="si-micro uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function KvList({ rows, compact }: { rows: KvRow[]; compact?: boolean }) {
  return (
    <dl className="divide-y">
      {rows.map((row, i) => (
        <KvRowView key={i} row={row} compact={compact} />
      ))}
    </dl>
  );
}

function KvRowView({ row, compact }: { row: KvRow; compact?: boolean }) {
  const valueClass = [
    "si-body break-words text-foreground",
    row.mono ? "font-mono text-xs" : "",
    row.truncate ? "truncate" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const display: React.ReactNode =
    row.value === null || row.value === undefined ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      row.value
    );

  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 gap-0.5 px-4 py-2 sm:grid-cols-[40%_1fr] sm:items-baseline sm:gap-3"
          : "grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[40%_1fr] sm:items-baseline sm:gap-3"
      }
    >
      <dt className="si-caption text-muted-foreground">{row.label}</dt>
      <dd className={valueClass}>{display}</dd>
    </div>
  );
}
