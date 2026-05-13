import Link from "next/link";
import { Database, Layers, ScanText, Wand2 } from "lucide-react";

import { Pill } from "@/components/ui/pill";
import { StatGroup, type StatItem } from "@/components/ui/stat-group";
import { cn } from "@/lib/utils";
import type {
  AttributeUsageInIdentityProfile,
  AttributeUsageInTransform,
  IdentityAttributeDetail,
} from "@/lib/sailpoint/identity-attributes-api";

/**
 * Locale-pinned formatter — see source-overview / identities-table for
 * the hydration-mismatch rationale.
 */
const NUMBER_FMT = new Intl.NumberFormat("en-US");

type Props = {
  attribute: IdentityAttributeDetail;
  profilesResult:
    | { ok: true; data: AttributeUsageInIdentityProfile[] }
    | { ok: false; status: number; message: string };
  transformsResult:
    | { ok: true; data: AttributeUsageInTransform[] }
    | { ok: false; status: number; message: string };
};

/**
 * Overview tab: 4-KPI inline strip + Config card.
 *
 * KPIs:
 *   - Identity profiles using it: distinct profile count from the
 *     `getAttributeUsageInIdentityProfiles` walker.
 *   - Transforms producing it: distinct transform count from the
 *     `getAttributeUsageInTransforms` walker (cross-ref walker matches
 *     `{type:"identityAttribute"}` references, which is the canonical
 *     "produces / depends on" shape).
 *   - Sources contributing: derived from `attribute.sources` (direct
 *     source/attr mappings + rule bindings). The list endpoint already
 *     surfaces these — no extra fetch.
 *   - Population coverage: descoped for v0 (would require a second
 *     `/v2025/search` count query). Shows "—" with a sub-line note so
 *     the cell isn't visually empty.
 *
 * KPIs that errored show "—" rather than disappearing — the parent
 * page surfaces per-tab error banners separately, the KPI strip stays
 * informational.
 */
export function AttributeOverview({
  attribute,
  profilesResult,
  transformsResult,
}: Props) {
  const profilesCount = profilesResult.ok
    ? new Set(profilesResult.data.map((p) => p.profileId)).size
    : null;
  const transformsCount = transformsResult.ok
    ? new Set(transformsResult.data.map((t) => t.transformId)).size
    : null;
  const sources = attribute.sources ?? [];
  const sourcesCount = sources.length;

  const stats: StatItem[] = [
    {
      label: "Identity profiles",
      value:
        profilesCount !== null ? NUMBER_FMT.format(profilesCount) : "—",
      sub: profilesCount === 0 ? "Not mapped on any profile" : "Mapped on",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: "Transforms producing it",
      value:
        transformsCount !== null ? NUMBER_FMT.format(transformsCount) : "—",
      sub:
        transformsCount === 0
          ? "No transforms reference it"
          : "Reference this attribute",
      icon: <Wand2 className="h-4 w-4" />,
    },
    {
      label: "Sources contributing",
      value: NUMBER_FMT.format(sourcesCount),
      sub: sourcesCount === 0 ? "No direct source binding" : "Bound on",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "Population coverage",
      value: "—",
      sub: "Not computed in v0",
      icon: <ScanText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <StatGroup layout="inline" items={stats} />
      <ConfigCard
        attribute={attribute}
        profilesResult={profilesResult}
      />
    </div>
  );
}

/**
 * Static config card — the attribute's spec (type, multi, searchable,
 * standard) followed by the identity profile mappings list. Each mapping
 * is a (profile name → transformDefinition summary) row. The
 * transformDefinition summary keeps it terse: for a `{type:"reference"}`
 * we surface the referenced transform name; for inline payloads we just
 * note the root operation type. The full JSON is reachable via the
 * Transforms tab + transform editor.
 */
function ConfigCard({
  attribute,
  profilesResult,
}: {
  attribute: IdentityAttributeDetail;
  profilesResult:
    | { ok: true; data: AttributeUsageInIdentityProfile[] }
    | { ok: false; status: number; message: string };
}) {
  const standard = attribute.standard === true;

  const specRows: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Technical name",
      value: <span className="font-mono">{attribute.name}</span>,
    },
    { label: "Display name", value: attribute.displayName ?? "—" },
    { label: "Type", value: attribute.type ?? "—" },
    {
      label: "Multi-valued",
      value: attribute.multi ? "Yes" : "No",
    },
    {
      label: "Searchable",
      value: attribute.searchable ? "Yes" : "No",
    },
    {
      label: "Scope",
      value: standard ? (
        <Pill tone="accent">Standard</Pill>
      ) : (
        <Pill tone="neutral">Custom</Pill>
      ),
    },
  ];

  return (
    <section className="space-y-2">
      <h2 className="si-caption uppercase tracking-wider text-muted-foreground">
        Configuration
      </h2>
      <div className="overflow-hidden rounded-md border bg-card">
        <dl className="divide-y">
          {specRows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
      </div>

      <h2 className="si-caption uppercase tracking-wider text-muted-foreground pt-4">
        Identity profile mappings
      </h2>
      <div className="overflow-hidden rounded-md border bg-card">
        {profilesResult.ok ? (
          profilesResult.data.length === 0 ? (
            <div className="px-4 py-4 si-body text-muted-foreground">
              Not mapped on any identity profile.
            </div>
          ) : (
            <dl className="divide-y">
              {profilesResult.data.map((mapping) => (
                <Row
                  key={mapping.profileId}
                  label={mapping.profileName}
                  value={
                    <TransformDefinitionSummary
                      definition={mapping.transformDefinition}
                    />
                  }
                />
              ))}
            </dl>
          )
        ) : (
          <div className="px-4 py-4 si-body text-muted-foreground">
            Couldn&apos;t load identity profile mappings ({profilesResult.status}
            ).
          </div>
        )}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-1 px-4 py-2.5",
        "sm:grid-cols-[220px_1fr] sm:items-center sm:gap-3",
      )}
    >
      <dt className="si-caption text-muted-foreground">{label}</dt>
      <dd className="si-body break-words text-foreground">{value}</dd>
    </div>
  );
}

/**
 * One-line summary of a `transformDefinition` payload from an identity
 * profile mapping. ISC stores this in one of two shapes:
 *   - `{ type: "reference", attributes: { id: "<transformName>" } }` —
 *     a named transform (clickable, links to editor once we resolve the
 *     name → id).
 *   - inline `{ type: "<op>", attributes: { ... } }` — surfaced as just
 *     the operation type with a "Inline" pill so readers know the
 *     definition lives only in the profile.
 *
 * Resolving a transform name → id needs the transform list (which we
 * already fetch for the Transforms tab on this page) — but the Overview
 * doesn't get that list. For v0 we render the name as plain text; the
 * Transforms tab handles the navigation.
 */
function TransformDefinitionSummary({
  definition,
}: {
  definition: unknown;
}) {
  if (!definition || typeof definition !== "object") {
    return <span className="text-muted-foreground">—</span>;
  }
  const def = definition as { type?: string; attributes?: unknown };
  if (def.type === "reference") {
    const attrs = def.attributes as { id?: string } | undefined;
    const refName = attrs?.id ?? null;
    if (refName) {
      return (
        <span className="inline-flex items-center gap-2">
          <Pill tone="neutral">Reference</Pill>
          <Link
            href={`/sailpoint/transforms?filters=${encodeURIComponent(refName)}`}
            className="font-mono underline-offset-2 hover:underline"
          >
            {refName}
          </Link>
        </span>
      );
    }
    return <Pill tone="neutral">Reference</Pill>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Pill tone="neutral">Inline</Pill>
      <span className="font-mono text-muted-foreground">
        {def.type ?? "unknown"}
      </span>
    </span>
  );
}
