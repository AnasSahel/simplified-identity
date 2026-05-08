"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  createTransformAction,
  updateTransformAction,
  type ActionResult,
} from "./editor-actions";

type Mode =
  | { kind: "new" }
  | { kind: "edit"; id: string; originalName: string };

const NEW_TEMPLATE = `{
  "name": "trf-my-new-transform",
  "type": "static",
  "attributes": {
    "value": "Hello world"
  }
}
`;

export function TransformEditor({
  mode,
  initialJson,
}: {
  mode: Mode;
  initialJson?: string;
}) {
  const router = useRouter();
  const initial = initialJson ?? NEW_TEMPLATE;
  const [value, setValue] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const dirty = value !== initial;
  const localValidation = React.useMemo(() => validateLocally(value), [value]);
  const canSave =
    !pending &&
    localValidation.ok &&
    (mode.kind === "new" ? value.trim().length > 0 : dirty);

  function onSave() {
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      if (mode.kind === "new") {
        result = await createTransformAction(value);
      } else {
        result = await updateTransformAction(mode.id, value);
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/transforms?selected=${encodeURIComponent(result.id)}`);
      router.refresh();
    });
  }

  function onCancel() {
    if (dirty && !confirm("Discard changes and go back?")) return;
    router.push("/transforms");
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6">
      <div className="flex items-center gap-2">
        <Link
          href="/transforms"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back to transforms"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode.kind === "new"
            ? "New transform"
            : `Edit · `}
          {mode.kind === "edit" && (
            <span className="font-mono text-xl">{mode.originalName}</span>
          )}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Edit the JSON definition. The local registry validates the shape; SailPoint
        validates the rest at save time.
      </p>

      <div className="overflow-hidden rounded-md border bg-card">
        <CodeMirror
          value={value}
          height="480px"
          extensions={[jsonLang()]}
          onChange={(v) => {
            setValue(v);
            if (error) setError(null);
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
          }}
          theme="light"
        />
      </div>

      {(!localValidation.ok || error) && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="font-medium">
            {error ? "Save failed" : "Validation"}
          </p>
          <p className="mt-1 font-mono leading-relaxed">
            {error ?? (localValidation.ok ? "" : localValidation.error)}
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={onSave}
          className={cn("gap-1.5", !canSave && "cursor-not-allowed")}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {mode.kind === "new" ? "Create" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function validateLocally(
  jsonString: string,
): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Top-level value must be a JSON object." };
    }
    const o = parsed as Record<string, unknown>;
    if (typeof o.name !== "string" || o.name.trim() === "") {
      return { ok: false, error: "`name` must be a non-empty string." };
    }
    if (typeof o.type !== "string" || o.type.trim() === "") {
      return { ok: false, error: "`type` must be a non-empty string." };
    }
    if (
      typeof o.attributes !== "object" ||
      o.attributes === null ||
      Array.isArray(o.attributes)
    ) {
      return { ok: false, error: "`attributes` must be a JSON object." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
}
