"use client";

import * as React from "react";

import { RowActions } from "@/components/ui/row-actions";

/**
 * ⋯ menu for a row on the Sources list. View detail + Copy ID for v0;
 * the Trigger Aggregation entry stays out until #143 wires the server
 * action — adding a no-op now would mislead reviewers about what works.
 */
export function SourcesRowActions({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <RowActions
      label={`Actions for ${name}`}
      header={name}
      items={[
        {
          label: "View detail",
          href: `/sailpoint/sources/${encodeURIComponent(id)}`,
        },
        {
          label: "Copy source ID",
          onSelect: () => {
            navigator.clipboard?.writeText(id);
          },
        },
      ]}
    />
  );
}
