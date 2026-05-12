"use client";

import * as React from "react";
import { Copy, CopyPlus, Eye, Trash2 } from "lucide-react";

import { RowActions as RowActionsBase } from "@/components/ui/row-actions";

import { DeleteTransformDialog } from "./delete-dialog";
import { DuplicateTransformDialog } from "./duplicate-dialog";

/**
 * Domain wrapper around `<RowActions>` for transform rows. Owns the
 * Duplicate + Delete dialog state. See DESIGN.md §2.11.
 */
export function RowActions({
  id,
  name,
  usages,
  internal,
  tenantTransformNames,
}: {
  id: string;
  name: string;
  usages?: number;
  internal?: boolean;
  /** All names currently in the tenant — passed down so the Duplicate
   * dialog can pre-compute a unique default without a round-trip. */
  tenantTransformNames: ReadonlyArray<string>;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [duplicateOpen, setDuplicateOpen] = React.useState(false);

  function copyName() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(name);
    }
  }

  return (
    <>
      <RowActionsBase
        label={`Actions for ${name}`}
        items={[
          {
            label: "View details",
            icon: <Eye className="h-3.5 w-3.5" />,
            href: `/transforms/${encodeURIComponent(id)}`,
          },
          {
            label: "Copy name",
            icon: <Copy className="h-3.5 w-3.5" />,
            onSelect: copyName,
          },
          { divider: true },
          {
            label: "Duplicate…",
            icon: <CopyPlus className="h-3.5 w-3.5" />,
            onSelect: () => setDuplicateOpen(true),
          },
          ...(!internal
            ? ([
                { divider: true } as const,
                {
                  label: "Delete…",
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  tone: "danger" as const,
                  onSelect: () => setDeleteOpen(true),
                },
              ])
            : []),
        ]}
      />

      <DuplicateTransformDialog
        transform={{ id, name }}
        tenantTransformNames={tenantTransformNames}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />

      {!internal && (
        <DeleteTransformDialog
          id={id}
          name={name}
          usages={usages}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  );
}
