"use client";

import * as React from "react";
import { Copy, Download, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { SelectableTransform } from "./types";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isoStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BulkActionBar({
  selected,
  onClear,
}: {
  selected: SelectableTransform[];
  onClear: () => void;
}) {
  const [exporting, setExporting] = React.useState(false);
  const count = selected.length;

  function handleExport() {
    setExporting(true);
    try {
      // Mirror the SailPoint /v2025/transforms response shape so the file
      // can be re-imported or diffed against the API directly.
      const payload = selected.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        internal: t.internal,
        attributes: t.attributes ?? {},
      }));
      const filename =
        count === 1
          ? `transform-${selected[0].name}-${isoStamp()}.json`
          : `transforms-${count}-${isoStamp()}.json`;
      downloadJson(filename, payload);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-foreground/15 bg-foreground/5 px-3 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <span className="font-medium">
          {count} {count === 1 ? "transform" : "transforms"} selected
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export as JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="cursor-not-allowed gap-1.5"
          title="Duplicate coming soon"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="cursor-not-allowed gap-1.5 text-destructive/80"
          title="Delete coming soon"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
