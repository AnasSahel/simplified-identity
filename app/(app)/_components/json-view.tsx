import { cn } from "@/lib/utils";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Token classes (Tailwind). Priority order matters: keys first
// (matched as `"..."` followed by `:`), then string values, then
// booleans / null / numbers.
const TOKEN_RE =
  /(&quot;(?:[^&\\]|\\.)*?&quot;)(\s*:)|(&quot;(?:[^&\\]|\\.)*?&quot;)|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function highlightJson(json: string): string {
  const escaped = escapeHtml(json);
  return escaped.replace(
    TOKEN_RE,
    (
      _match,
      keyStr,
      keyColon,
      strVal,
      boolVal,
      nullVal,
      numVal,
    ) => {
      if (keyStr && keyColon) {
        return `<span class="text-sky-700 dark:text-sky-300">${keyStr}</span>${keyColon}`;
      }
      if (strVal) {
        return `<span class="text-emerald-700 dark:text-emerald-400">${strVal}</span>`;
      }
      if (boolVal) {
        return `<span class="text-amber-700 dark:text-amber-400">${boolVal}</span>`;
      }
      if (nullVal) {
        return `<span class="text-zinc-500">${nullVal}</span>`;
      }
      if (numVal) {
        return `<span class="text-rose-700 dark:text-rose-400">${numVal}</span>`;
      }
      return "";
    },
  );
}

export function JsonView({
  data,
  className,
}: {
  data: unknown;
  className?: string;
}) {
  const json = JSON.stringify(data, null, 2);
  const html = highlightJson(json);
  return (
    <pre
      className={cn(
        "overflow-x-auto p-4 font-mono text-xs leading-relaxed",
        className,
      )}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
