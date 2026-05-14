"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const EXPORT_PATH = "/api/identities/export";

const FILTER_KEYS = ["q", "profile", "lcs", "department", "risk"] as const;

function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null;
  const match = /filename="?([^";]+)"?/i.exec(value);
  return match?.[1] ?? null;
}

export function ExportFullButton({ total }: { total: number }) {
  const searchParams = useSearchParams();
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [warning, setWarning] = React.useState<string | null>(null);

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${EXPORT_PATH}?${qs}` : EXPORT_PATH;
  }, [searchParams]);

  async function onClick() {
    setBusy(true);
    setProgress(0);
    setWarning(null);
    try {
      const response = await fetch(exportUrl, { credentials: "same-origin" });
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        setWarning(
          `Export failed (${response.status}). ${text.slice(0, 120)}`,
        );
        return;
      }

      const exportStatus = response.headers.get("X-Export-Status") ?? "ok";
      const filename =
        filenameFromDisposition(response.headers.get("Content-Disposition")) ??
        `identities-${new Date().toISOString().slice(0, 10)}.csv`;

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      const chunks: Uint8Array[] = [];
      let decodedTail = "";
      let rowsSeen = 0;
      let sawMidStreamError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        const text = decoder.decode(value, { stream: true });
        decodedTail += text;
        // Count newlines emitted so far. The first newline is the header,
        // so subtract one. This is a progress hint, not an exact count.
        const newlines = decodedTail.match(/\n/g)?.length ?? 0;
        rowsSeen = Math.max(0, newlines - 1);
        if (decodedTail.includes("# ERROR:")) sawMidStreamError = true;
        // Trim the tail to keep the indexOf cheap — only the last segment
        // matters for the marker check.
        if (decodedTail.length > 4096) {
          decodedTail = decodedTail.slice(-2048);
        }
        setProgress(rowsSeen);
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (sawMidStreamError) {
        setWarning(
          "Export completed with errors. The CSV is truncated — check the last row for details.",
        );
      } else if (exportStatus === "capped") {
        setWarning(
          "Export reached the 50,000 row cap. Refine filters to export the rest.",
        );
      }
    } catch (err) {
      setWarning(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const label = busy
    ? progress > 0
      ? `Exporting ${progress.toLocaleString()}…`
      : "Exporting…"
    : `Export all (${total.toLocaleString()})`;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="default"
        size="sm"
        className="gap-1.5"
        onClick={onClick}
        disabled={busy}
        aria-disabled={busy}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {label}
      </Button>
      {warning ? (
        <p
          role="status"
          className="flex max-w-xs items-start gap-1 text-[11px] leading-tight text-amber-700 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{warning}</span>
        </p>
      ) : null}
    </div>
  );
}
