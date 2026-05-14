import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DetailHeader } from "../../../_components/detail-shell";
import { HealthPill } from "./health-pill";
import { SourceAvatar } from "./source-avatar";

type SourceForHeader = {
  id: string;
  name: string;
  description?: string | null;
  connector?: string | null;
  connectorName?: string | null;
  healthy?: boolean;
  status?: string | null;
  authoritative?: boolean;
  owner?: { id: string; name: string } | null;
  connectorAttributes?: Record<string, unknown>;
};

function AuthBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 si-micro font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
      Authoritative
    </span>
  );
}

/**
 * Best-effort version extraction from `connectorAttributes`. ISC stores
 * version as a free-form `version` (or sometimes `connectorVersion`) field
 * on most connectors, but the shape isn't guaranteed — coerce to a
 * trimmed string and bail otherwise so we never render an `[object …]`.
 */
function pickVersion(attrs: Record<string, unknown> | undefined): string | null {
  if (!attrs) return null;
  const candidate = attrs.version ?? attrs.connectorVersion;
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof candidate === "number") return String(candidate);
  return null;
}

/**
 * Disabled stub button for actions whose handler isn't wired yet (Test
 * connection → #182, Edit → forthcoming). Wraps in a tooltip so the
 * "Coming in v2" reason is discoverable on hover.
 *
 * Disabled buttons swallow pointer events, which prevents Radix tooltips
 * from triggering on the button itself — wrap the button in a
 * `<span tabIndex>` so the tooltip target stays focusable / hoverable.
 */
function StubAction({
  children,
  reason = "Coming in v2",
}: {
  children: React.ReactNode;
  reason?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-block">
          <Button variant="outline" size="sm" disabled aria-disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Subtitle line: `Connector · version · Owner · mono ID`.
 * Each segment is independently optional and only renders if it has a
 * value; separators are interleaved so we never render orphan dots.
 */
function SubtitleLine({
  connectorLabel,
  version,
  owner,
  id,
}: {
  connectorLabel: string | null;
  version: string | null;
  owner: { id: string; name: string } | null | undefined;
  id: string;
}) {
  const segments: React.ReactNode[] = [];
  if (connectorLabel) segments.push(<span key="connector">{connectorLabel}</span>);
  if (version)
    segments.push(
      <span key="version" className="font-mono">
        v{version}
      </span>,
    );
  segments.push(
    <span key="owner">
      {"Owner: "}
      {owner ? (
        <Link
          href={`/sailpoint/identities/${encodeURIComponent(owner.id)}`}
          className="text-foreground hover:underline"
        >
          {owner.name}
        </Link>
      ) : (
        <span className="text-muted-foreground/60">—</span>
      )}
    </span>,
  );
  segments.push(
    <span
      key="id"
      className="font-mono text-muted-foreground/80"
      title="Source ID"
    >
      {id}
    </span>,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 si-body text-muted-foreground">
      {segments.flatMap((segment, idx) =>
        idx === 0
          ? [segment]
          : [
              <span
                key={`sep-${idx}`}
                aria-hidden
                className="text-muted-foreground/40"
              >
                ·
              </span>,
              segment,
            ],
      )}
    </div>
  );
}

/**
 * Header for the Source detail page. Composes `<DetailHeader>` with:
 *  - 56×56 colored avatar (size `lg`)
 *  - title row: name + Authoritative badge + connector kind badge + Health pill
 *  - subtitle: connector · version · owner link · mono ID
 *  - actions toolbar: Aggregate now / Test connection / Edit (all stubbed
 *    until #143 / #182 / Edit issue land)
 *
 * Real handlers tracked under #143 (Aggregate now), #182 (Test connection),
 * and a forthcoming Edit issue.
 */
export function SourceDetailHeader({ source }: { source: SourceForHeader }) {
  const connectorLabel = source.connectorName ?? source.connector ?? null;
  const version = pickVersion(source.connectorAttributes);

  return (
    <DetailHeader
      avatar={
        <SourceAvatar
          name={source.name}
          connector={source.connector}
          size="lg"
        />
      }
      title={source.name}
      subtitle={
        <SubtitleLine
          connectorLabel={connectorLabel}
          version={version}
          owner={source.owner}
          id={source.id}
        />
      }
      badges={
        <>
          {source.authoritative && <AuthBadge />}
          {connectorLabel && <Pill tone="neutral">{connectorLabel}</Pill>}
          <HealthPill healthy={source.healthy} status={source.status} />
        </>
      }
      actions={
        <>
          <StubAction>Aggregate now</StubAction>
          <StubAction>Test connection</StubAction>
          <StubAction>Edit</StubAction>
        </>
      }
    />
  );
}
