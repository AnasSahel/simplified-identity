const RTF = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
const DTF = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * `<TimestampCell>` — relative or absolute date formatting for table
 * cells. Falls back to a muted em-dash when the value is missing or
 * un-parseable. See DESIGN.md §2.3.
 */
export function TimestampCell({
  value,
  mode = "relative",
}: {
  value: string | null | undefined;
  mode?: "relative" | "absolute";
}) {
  if (!value) {
    return (
      <span className="si-caption text-muted-foreground/50">—</span>
    );
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return (
      <span className="si-caption text-muted-foreground/50">—</span>
    );
  }
  return (
    <span className="si-caption text-muted-foreground">
      {mode === "absolute" ? DTF.format(d) : formatRelative(d)}
    </span>
  );
}

function formatRelative(d: Date): string {
  const diff = d.getTime() - Date.now();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return RTF.format(days, "day");
  return DTF.format(d);
}
