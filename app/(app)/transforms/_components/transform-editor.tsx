"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { keymap } from "@codemirror/view";
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { templateFor } from "@/lib/sailpoint/transforms/templates";

import {
  createTransformAction,
  updateTransformAction,
  type ActionResult,
} from "./editor-actions";
import {
  transformAutocomplete,
  transformTypeHover,
} from "./codemirror-extensions";
import { InsertTransformDialog } from "./insert-dialog";
import { TypePicker } from "./type-picker";

type Mode =
  | { kind: "new" }
  | { kind: "edit"; id: string; originalName: string };

type TenantTransform = { id: string; name: string; type: string };
type TenantSource = { id: string; name: string };

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
  tenantTransforms,
  tenantSources,
}: {
  mode: Mode;
  initialJson?: string;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
}) {
  const router = useRouter();
  const editorRef = React.useRef<ReactCodeMirrorRef | null>(null);
  const initial = initialJson ?? NEW_TEMPLATE;
  const [value, setValue] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [insertOpen, setInsertOpen] = React.useState(false);

  const dirty = value !== initial;
  const localValidation = React.useMemo(() => validateLocally(value), [value]);
  const canSave =
    !pending &&
    localValidation.ok &&
    (mode.kind === "new" ? value.trim().length > 0 : dirty);

  // Derive `type` and `name` for the controls above the editor. When the
  // JSON doesn't parse, fall back to the last best-effort values.
  const derived = React.useMemo(() => deriveRoot(value), [value]);

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

  function setRootType(newType: string) {
    setValue((prev) => mutateOrRebuild(prev, "type", newType));
  }

  function setRootName(newName: string) {
    setValue((prev) => mutateOrRebuild(prev, "name", newName));
  }

  function insertAtCursor(skeleton: string) {
    const view = editorRef.current?.view;
    if (!view) return;
    const cursor = view.state.selection.main.head;
    view.dispatch({
      changes: { from: cursor, to: cursor, insert: skeleton },
      selection: { anchor: cursor + skeleton.length },
    });
    view.focus();
  }

  const extensions = React.useMemo(
    () => [
      jsonLang(),
      transformAutocomplete(
        tenantTransforms.map((t) => ({ id: t.id, name: t.name, type: t.type })),
        tenantSources.map((s) => ({ id: s.id, name: s.name })),
      ),
      transformTypeHover(),
      keymap.of([
        {
          key: "Mod-i",
          preventDefault: true,
          run: () => {
            setInsertOpen(true);
            return true;
          },
        },
        {
          key: "Mod-s",
          preventDefault: true,
          run: () => {
            if (canSave) onSave();
            return true;
          },
        },
      ]),
    ],
    // canSave / onSave deliberately stale; CodeMirror's keymap uses a snapshot
    // closure. Re-create the extension when those change (rare).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantTransforms, tenantSources, canSave],
  );

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
          {mode.kind === "new" ? "New transform" : `Edit · `}
          {mode.kind === "edit" && (
            <span className="font-mono text-xl">{mode.originalName}</span>
          )}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Edit the JSON definition. Use{" "}
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘I</kbd>{" "}
        to insert a sub-transform,{" "}
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘S</kbd>{" "}
        to save.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <TypePicker value={derived.type} onChange={setRootType} />
        <input
          type="text"
          value={derived.name}
          onChange={(e) => setRootName(e.currentTarget.value)}
          placeholder="trf-my-transform"
          className="h-9 flex-1 min-w-[16rem] rounded-md border border-input bg-background px-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          spellCheck={false}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setInsertOpen(true)}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Insert transform
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <CodeMirror
          ref={editorRef}
          value={value}
          height="480px"
          extensions={extensions}
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
          <p className="font-medium">{error ? "Save failed" : "Validation"}</p>
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

      <InsertTransformDialog
        open={insertOpen}
        onOpenChange={setInsertOpen}
        onInsert={insertAtCursor}
      />
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

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

function deriveRoot(jsonString: string): { type: string | null; name: string } {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { type: null, name: "" };
    }
    const o = parsed as Record<string, unknown>;
    return {
      type: typeof o.type === "string" ? o.type : null,
      name: typeof o.name === "string" ? o.name : "",
    };
  } catch {
    return { type: null, name: "" };
  }
}

/**
 * Try to parse the current JSON and update the given root key. If parsing
 * fails (user is mid-typing), rebuild a minimal valid structure that
 * preserves what we can from the prior value.
 */
function mutateOrRebuild(
  prev: string,
  key: "type" | "name",
  newValue: string,
): string {
  try {
    const parsed = JSON.parse(prev) as Record<string, unknown>;
    if (key === "type") {
      // Switching the type leaves attributes alone (option a from ADR 012).
      // If attributes is missing or wrong shape, restore an empty object so
      // the JSON stays valid against the registry's shape check.
      parsed.type = newValue;
      if (
        typeof parsed.attributes !== "object" ||
        parsed.attributes === null ||
        Array.isArray(parsed.attributes)
      ) {
        // Use the new type's template attributes as a starting point.
        parsed.attributes = templateFor(newValue).attributes;
      }
    } else {
      parsed.name = newValue;
    }
    if (typeof parsed.name !== "string") parsed.name = "";
    if (typeof parsed.type !== "string") parsed.type = "";
    return JSON.stringify(parsed, null, 2);
  } catch {
    // JSON unparseable — rebuild a minimal valid skeleton, taking what we
    // can from a partial parse.
    const base = templateFor(key === "type" ? newValue : "static");
    return JSON.stringify(
      {
        name: key === "name" ? newValue : "",
        type: key === "type" ? newValue : base.type,
        attributes: base.attributes,
      },
      null,
      2,
    );
  }
}
