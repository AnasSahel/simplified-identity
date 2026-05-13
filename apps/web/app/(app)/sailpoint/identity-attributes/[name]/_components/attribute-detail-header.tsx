import { Tag } from "lucide-react";

import { Pill } from "@/components/ui/pill";
import type { IdentityAttributeDetail } from "@/lib/sailpoint/identity-attributes-api";

import { DetailHeader } from "../../../../_components/detail-shell";

/**
 * Header for the Identity Attribute detail page. Mirrors the
 * `SourceDetailHeader` pattern: avatar + large title (display name) +
 * subtitle (technical name in mono) + status pills (type, multi,
 * searchable, standard/custom).
 *
 * Standard/custom is the most semantically loaded pill — `Standard`
 * (accent) flags an OOTB attribute, `Custom` (neutral) flags a
 * tenant-defined one. Multi/Searchable are surfaced only when `true`
 * to keep the badge row legible on the common path.
 */
export function AttributeDetailHeader({
  attribute,
}: {
  attribute: IdentityAttributeDetail;
}) {
  const displayName = attribute.displayName ?? attribute.name;
  const standard = attribute.standard === true;

  return (
    <DetailHeader
      avatar={
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
          aria-hidden
        >
          <Tag className="h-6 w-6" />
        </div>
      }
      title={displayName}
      subtitle={
        <span className="font-mono text-muted-foreground">
          {attribute.name}
        </span>
      }
      badges={
        <>
          {attribute.type ? (
            <Pill tone="neutral">{attribute.type}</Pill>
          ) : null}
          {attribute.multi ? <Pill tone="info">Multi</Pill> : null}
          {attribute.searchable ? (
            <Pill tone="info">Searchable</Pill>
          ) : null}
          {standard ? (
            <Pill tone="accent">Standard</Pill>
          ) : (
            <Pill tone="neutral">Custom</Pill>
          )}
        </>
      }
    />
  );
}
