import { Database } from "lucide-react";

import { Pill } from "@/components/ui/pill";

import { DetailHeader } from "../../../_components/detail-shell";
import { SourceStatusPill } from "./source-status-pill";

type SourceForHeader = {
  name: string;
  description?: string | null;
  connector?: string | null;
  connectorName?: string | null;
  healthy?: boolean;
  status?: string | null;
  authoritative?: boolean;
  owner?: { id: string; name: string } | null;
};

function AuthBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 si-micro font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      Authoritative
    </span>
  );
}

/**
 * Header for the Source detail page. Composes `<DetailHeader>` with the
 * source name + connector + status pills, and surfaces the owner in the
 * subtitle. The actions slot is wired empty for now — Trigger Aggregation
 * lands in #143.
 */
export function SourceDetailHeader({ source }: { source: SourceForHeader }) {
  const connectorLabel = source.connectorName ?? source.connector ?? null;
  const subtitle = source.owner
    ? `Owner: ${source.owner.name}`
    : source.description
      ? source.description
      : undefined;

  return (
    <DetailHeader
      avatar={
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
          aria-hidden
        >
          <Database className="h-6 w-6" />
        </div>
      }
      title={source.name}
      subtitle={subtitle}
      badges={
        <>
          {connectorLabel && <Pill tone="neutral">{connectorLabel}</Pill>}
          <SourceStatusPill
            healthy={source.healthy}
            status={source.status}
          />
          {source.authoritative && <AuthBadge />}
        </>
      }
    />
  );
}
