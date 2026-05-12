"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { highlightJson } from "../../../_components/json-view";

/**
 * Dark code block that displays a JSON string with the shared
 * `highlightJson` token colours and a Copy-to-clipboard button.
 *
 * Used in both the list-page drawer (read-only view of a saved
 * transform) and the editor's drawer (live preview of the draft).
 */
export function JsonPanel({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const html = React.useMemo(() => highlightJson(value), [value]);

  function copy() {
    function markCopied() {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }

    function legacyFallback(): boolean {
      // Last-resort fallback for browsers without the Clipboard API or
      // when permission is denied (e.g., the page isn't on a secure
      // context). document.execCommand is deprecated but still works
      // everywhere we care about.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }

    if (!navigator.clipboard) {
      if (legacyFallback()) markCopied();
      return;
    }

    navigator.clipboard.writeText(value).then(markCopied, () => {
      // Clipboard API rejected (denied permission, insecure context, …).
      // Try the legacy path before giving up.
      if (legacyFallback()) markCopied();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 z-10 inline-flex h-7 items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-2 text-[11px] text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> Copy
          </>
        )}
      </button>
      <pre
        className="overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed text-neutral-200"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
