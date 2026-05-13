import { AlertTriangle, Database, Users, Wand2 } from "lucide-react";

import { StatGroup } from "@/components/ui/stat-group";

/**
 * Dashboard KPI strip — 4 tenant-level signal cards.
 *
 * Values are placeholders until the real fetch lands. The signal-layer
 * issue (#151) ships the structure; per-source counts will be wired
 * incrementally afterwards.
 *
 * TODO(#151): replace hardcoded values with ISC fetches —
 *   - identities total + active/pending split via /v2025/identities count
 *   - sources health via /v2025/sources aggregated status
 *   - transforms in-use via existing usages walker in packages/transforms
 *   - risk count via /v2025/identities filter on risk score >= medium
 */
export function KpiStrip() {
  return (
    <StatGroup
      layout="grid"
      items={[
        {
          label: "Identities",
          value: "965",
          sub: (
            <span className="si-caption text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">
                ▲ 12
              </span>{" "}
              active · 1 pending
            </span>
          ),
          href: "/sailpoint/identities",
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: "Sources",
          value: "28",
          sub: (
            <span className="si-caption text-muted-foreground">
              <span className="text-amber-600 dark:text-amber-400">● 3</span>{" "}
              in error · 25 healthy
            </span>
          ),
          href: "/sailpoint/sources",
          icon: <Database className="h-4 w-4" />,
        },
        {
          label: "Transforms",
          value: "98",
          sub: (
            <span className="si-caption text-muted-foreground">
              76 used · 22 unused
            </span>
          ),
          href: "/sailpoint/transforms",
          icon: <Wand2 className="h-4 w-4" />,
        },
        {
          label: "Risk",
          value: "12",
          sub: (
            <span className="si-caption text-muted-foreground">
              <span className="text-rose-600 dark:text-rose-400">▲ 4</span>{" "}
              review recommended
            </span>
          ),
          href: "/sailpoint/identities?risk=high",
          icon: <AlertTriangle className="h-4 w-4" />,
        },
      ]}
    />
  );
}
