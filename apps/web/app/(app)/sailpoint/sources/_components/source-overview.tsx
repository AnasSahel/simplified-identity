import { Activity, Clock, Layers, Users } from "lucide-react";

import { StatGroup, type StatItem } from "@/components/ui/stat-group";
import type {
  SourceAccount,
  SourceSchema,
} from "@/lib/sailpoint/sources-api";

/**
 * Overview tab — KPI strip computed from the account sample we already
 * fetched for the Accounts tab, plus the schema attribute list for
 * coverage. When `totalAccounts` exceeds the sample size, percentages
 * are flagged as estimates in the sub-line.
 */
export function SourceOverview({
  totalAccounts,
  sampleAccounts,
  schemas,
  since,
}: {
  totalAccounts: number | null;
  sampleAccounts: SourceAccount[];
  schemas: SourceSchema[] | null;
  since: string | null;
}) {
  const sampled = sampleAccounts.length;
  const truncated =
    totalAccounts !== null && sampled > 0 && totalAccounts > sampled;

  const correlatedCount = sampleAccounts.filter((a) =>
    Boolean(a.identityId),
  ).length;
  const correlationPct =
    sampled > 0 ? Math.round((correlatedCount / sampled) * 100) : null;

  const accountSchema =
    schemas?.find((s) => s.name === "account") ?? schemas?.[0] ?? null;
  const topAttributes = topAttributeCoverage(accountSchema, sampleAccounts, 3);

  const items: StatItem[] = [
    {
      label: "Accounts",
      value:
        totalAccounts !== null ? totalAccounts.toLocaleString() : "—",
      sub: "Total on this source",
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Last aggregation",
      value: since ? formatRelative(since) : "—",
      sub: since ? new Date(since).toLocaleString() : "Never run",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Correlation",
      value:
        correlationPct !== null ? `${correlationPct}%` : "—",
      sub:
        sampled === 0
          ? "No accounts to sample"
          : truncated
            ? `Estimated on first ${sampled.toLocaleString()} of ${totalAccounts?.toLocaleString()} accounts`
            : `${correlatedCount} of ${sampled} linked to an identity`,
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Top attributes",
      value:
        topAttributes.length > 0
          ? `${topAttributes[0].pct}%`
          : sampled === 0
            ? "—"
            : "n/a",
      sub:
        topAttributes.length > 0 ? (
          <span className="space-x-2">
            {topAttributes.map((a) => (
              <span key={a.name}>
                <span className="font-mono">{a.name}</span> {a.pct}%
              </span>
            ))}
            {truncated && (
              <span className="text-muted-foreground/70">(sampled)</span>
            )}
          </span>
        ) : sampled === 0 ? (
          "No accounts to sample"
        ) : (
          "No schema attributes declared"
        ),
      icon: <Layers className="h-4 w-4" />,
    },
  ];

  return <StatGroup layout="grid" items={items} />;
}

/**
 * For each declared attribute on the source's account schema, count the
 * fraction of the account sample where the field is present and non-empty,
 * and return the top N by coverage. Empty string and null both count as
 * absent. Nested `attributes.X` reads come from `account.attributes[X]`.
 */
function topAttributeCoverage(
  schema: SourceSchema | null,
  sample: SourceAccount[],
  n: number,
): { name: string; pct: number }[] {
  if (!schema || sample.length === 0) return [];
  const attrs = schema.attributes ?? [];
  const ranked = attrs
    .map((a) => {
      const filled = sample.filter((acc) => {
        const v = (acc.attributes ?? {})[a.name];
        if (v === null || v === undefined) return false;
        if (typeof v === "string") return v.length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length;
      return { name: a.name, pct: Math.round((filled / sample.length) * 100) };
    })
    .filter((x) => x.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  return ranked.slice(0, n);
}

/**
 * Tiny relative-time formatter — avoids dragging in a library for a single
 * KPI value. Anything older than a day falls back to "Xd ago".
 */
function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return new Date(t).toLocaleDateString();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}
