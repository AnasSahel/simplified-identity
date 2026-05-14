"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  csvSerializeRows,
  type IdentityRow,
} from "../_lib/csv";

export function ExportCsvButton({ rows }: { rows: IdentityRow[] }) {
  const [busy, setBusy] = React.useState(false);

  function onClick() {
    setBusy(true);
    try {
      const csv = csvSerializeRows(rows);
      // BOM keeps Excel happy with UTF-8 accents.
      const blob = new Blob(["﻿" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `identities-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={onClick}
      disabled={busy || rows.length === 0}
      aria-disabled={busy || rows.length === 0}
    >
      <Download className="h-3.5 w-3.5" />
      Export page
    </Button>
  );
}
