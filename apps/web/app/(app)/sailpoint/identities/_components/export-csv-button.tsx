"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { IdentityRow } from "./identities-table";

/**
 * CSV export of the currently-rendered page. Client-side, no streaming —
 * suitable for the default page sizes (up to 250 rows). A server-streamed
 * export for the full filtered dataset is a separate issue.
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: IdentityRow[]): string {
  const header = [
    "id",
    "name",
    "email",
    "department",
    "jobTitle",
    "manager",
    "lifecycleState",
    "riskScore",
    "accounts",
    "entitlements",
    "modified",
    "identityProfile",
    "external",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.name,
        r.email,
        r.department,
        r.jobTitle,
        r.manager?.name,
        r.lifecycleState,
        r.riskScore,
        r.accountCount,
        r.entitlementCount,
        r.modified,
        r.profileName,
        r.isExternal ? "true" : "false",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

export function ExportCsvButton({ rows }: { rows: IdentityRow[] }) {
  const [busy, setBusy] = React.useState(false);

  function onClick() {
    setBusy(true);
    try {
      const csv = toCsv(rows);
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
      Export
    </Button>
  );
}
