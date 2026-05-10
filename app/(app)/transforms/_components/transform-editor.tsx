"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { Prec, type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Play,
  Save,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { templateFor } from "@/lib/sailpoint/transforms/templates";
import {
  jsonToRecipe,
  recipeToJson,
  type RootRecipe,
} from "@/lib/sailpoint/transforms/recipe";
import {
  collectRequiredInputs,
  evaluateTransform,
  type EvalResult,
  type EvaluableTransform,
  type RequiredSimulationInput,
} from "@/lib/sailpoint/transform-evaluator";
import { sampleFor } from "@/lib/sailpoint/transform-samples";

import { highlightJson } from "../../_components/json-view";
import { TypePill } from "../../_components/type-pill";
import { getCatalogEntry } from "@/lib/sailpoint/transforms/catalog";
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
import { RecipeView } from "./recipe-view";

type Mode =
  | { kind: "new" }
  | { kind: "edit"; id: string; originalName: string };

type TenantTransform = { id: string; name: string; type: string };
type TenantSource = { id: string; name: string };
type DrawerTab = "test" | "json" | "tree";

const NEW_TEMPLATE = `{
  "name": "trf-my-new-transform",
  "type": "upper",
  "attributes": {
    "input": {
      "type": "accountAttribute",
      "attributes": {
        "sourceName": "",
        "attributeName": ""
      }
    }
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
  const [tab, setTab] = React.useState<DrawerTab>("json");
  const [showRaw, setShowRaw] = React.useState(false);

  const dirty = value !== initial;
  const localValidation = React.useMemo(() => validateLocally(value), [value]);
  const canSave =
    !pending &&
    localValidation.ok &&
    (mode.kind === "new" ? value.trim().length > 0 : dirty);

  const derived = React.useMemo(() => deriveRoot(value), [value]);

  const recipe = React.useMemo<RootRecipe | null>(() => {
    if (!localValidation.ok) return null;
    try {
      return jsonToRecipe(JSON.parse(value));
    } catch {
      return null;
    }
  }, [value, localValidation.ok]);

  const handleRecipeChange = React.useCallback(
    (next: RootRecipe) => {
      setValue(JSON.stringify(recipeToJson(next), null, 2));
      if (error) setError(null);
    },
    [error],
  );

  function liveValue(): string {
    const view = editorRef.current?.view;
    return view ? view.state.doc.toString() : value;
  }

  function onSave() {
    setError(null);
    const current = liveValue();
    startTransition(async () => {
      let result: ActionResult;
      if (mode.kind === "new") {
        result = await createTransformAction(current);
      } else {
        result = await updateTransformAction(mode.id, current);
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/transforms?selected=${encodeURIComponent(result.id)}`);
      router.refresh();
    });
  }

  const onSaveRef = React.useRef(onSave);
  const canSaveRef = React.useRef(canSave);
  React.useEffect(() => {
    onSaveRef.current = onSave;
    canSaveRef.current = canSave;
  });

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        setInsertOpen(true);
      }
      if (e.key === "s" || e.key === "S") {
        // Window-level fallback if focus isn't in CodeMirror
        if (!showRaw) {
          e.preventDefault();
          if (canSaveRef.current) onSaveRef.current();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showRaw]);

  function onCancel() {
    if (dirty && !confirm("Discard changes and go back?")) return;
    router.push("/transforms");
  }

  function setRootName(newName: string) {
    setValue((prev) => mutateOrRebuild(prev, "name", newName));
  }

  function setRootType(newType: string) {
    setValue((prev) => mutateOrRebuild(prev, "type", newType));
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
        tenantTransforms.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
        })),
        tenantSources.map((s) => ({ id: s.id, name: s.name })),
      ),
      transformTypeHover(),
      Prec.high(
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
              if (canSaveRef.current) onSaveRef.current();
              return true;
            },
          },
        ]),
      ),
    ],
    [tenantTransforms, tenantSources],
  );

  const nameEmpty = derived.name.trim().length === 0;
  const issuesCount =
    (nameEmpty ? 1 : 0) + (localValidation.ok ? 0 : 1) + (error ? 1 : 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* ── Top bar: breadcrumbs + actions ─────────────────────────────── */}
      <div className="flex items-center justify-between border-b bg-background/70 px-6 py-3 backdrop-blur">
        <Breadcrumbs mode={mode} />
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium",
              issuesCount === 0 ? "text-muted-foreground/70" : "text-amber-700",
            )}
          >
            <AlertCircle className="h-3 w-3" />
            {issuesCount} {issuesCount === 1 ? "issue" : "issues"}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
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
            {mode.kind === "new" ? "Create & Deploy" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* ── Two-column body ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: form + recipe */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <section>
              <h2 className="pb-3 text-sm font-semibold tracking-tight">
                General
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block pb-1 text-[11px] font-medium text-muted-foreground">
                    Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={derived.name}
                    onChange={(e) => setRootName(e.currentTarget.value)}
                    placeholder="trf-my-transform"
                    className={cn(
                      "h-9 w-full rounded-md border bg-background px-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1",
                      nameEmpty
                        ? "border-rose-500 focus-visible:ring-rose-500"
                        : "border-input focus-visible:ring-ring",
                    )}
                    spellCheck={false}
                  />
                  {nameEmpty && (
                    <p className="pt-1 text-[11px] text-rose-600">
                      Name is required
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between pb-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    Definition{" "}
                    <span className="font-normal text-muted-foreground">
                      Transforms compose recursively — every{" "}
                      <code className="rounded bg-muted px-1 font-mono text-[11px]">
                        input
                      </code>{" "}
                      can itself be a transform.
                    </span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRaw((s) => !s)}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showRaw ? "← Recipe view" : "Edit raw JSON →"}
                </button>
              </div>

              {showRaw ? (
                <RawJsonEditor
                  editorRef={editorRef}
                  value={value}
                  setValue={setValue}
                  setInsertOpen={setInsertOpen}
                  setError={setError}
                  error={error}
                  extensions={extensions}
                />
              ) : recipe ? (
                <RecipeView
                  recipe={recipe}
                  onRecipeChange={handleRecipeChange}
                  tenantTransforms={tenantTransforms}
                  tenantSources={tenantSources}
                />
              ) : (
                <div className="rounded-md border border-dashed bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Recipe view needs valid JSON. Switch to Raw JSON to fix it.
                </div>
              )}
            </section>

            {(!localValidation.ok || error) && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <p className="font-medium">{error ? "Save failed" : "Validation"}</p>
                <p className="mt-1 font-mono leading-relaxed">
                  {error ?? (localValidation.ok ? "" : localValidation.error)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right drawer: Test / JSON / Tree */}
        <aside className="hidden w-[28rem] shrink-0 border-l bg-card lg:flex lg:flex-col">
          <DrawerTabs tab={tab} setTab={setTab} />
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "json" && <JsonPanel value={value} />}
            {tab === "tree" && (
              <TreePanel draftJson={localValidation.ok ? value : null} />
            )}
            {tab === "test" && (
              <TestPanel
                draftJson={localValidation.ok ? value : null}
                tenantTransforms={tenantTransforms}
                tenantSources={tenantSources}
              />
            )}
          </div>
        </aside>
      </div>

      <InsertTransformDialog
        open={insertOpen}
        onOpenChange={setInsertOpen}
        onInsert={insertAtCursor}
      />
    </div>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────

function Breadcrumbs({ mode }: { mode: Mode }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link
        href="/transforms"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Back to transforms"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Link>
      <Link
        href="/transforms"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        Transforms
      </Link>
      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
      <span className="font-medium">
        {mode.kind === "new" ? "New" : `Edit · ${mode.originalName}`}
      </span>
      <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        Draft
      </span>
    </nav>
  );
}

// ── Drawer tabs ──────────────────────────────────────────────────────

function DrawerTabs({
  tab,
  setTab,
}: {
  tab: DrawerTab;
  setTab: (t: DrawerTab) => void;
}) {
  const tabs: { id: DrawerTab; label: string }[] = [
    { id: "test", label: "Test" },
    { id: "json", label: "JSON" },
    { id: "tree", label: "Tree" },
  ];
  return (
    <div className="flex gap-4 border-b px-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={cn(
            "h-10 text-xs font-medium transition-colors",
            tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block border-b-2 pb-2 -mb-px",
              tab === t.id ? "border-foreground" : "border-transparent",
            )}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── JSON panel ───────────────────────────────────────────────────────

function JsonPanel({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const html = React.useMemo(() => highlightJson(value), [value]);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
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

// ── Tree panel ───────────────────────────────────────────────────────

function TreePanel({ draftJson }: { draftJson: string | null }) {
  if (!draftJson) {
    return (
      <p className="text-xs text-muted-foreground">
        Fix the JSON to see the tree view.
      </p>
    );
  }
  const parsed = safeParse(draftJson);
  if (!parsed || !parsed.type) {
    return (
      <p className="text-xs text-muted-foreground">
        Couldn&apos;t parse the draft.
      </p>
    );
  }
  return (
    <div>
      <p className="pb-3 text-[11px] text-muted-foreground">
        The transform graph, simplified.
      </p>
      <TreeNode
        node={{ type: parsed.type, attributes: parsed.attributes }}
        connectorLabel={null}
      />
    </div>
  );
}

/**
 * Recursive plain-tree renderer. Each node is one row (type pill + short
 * description); children get an indent + amber dashed guide on the left
 * and a tiny `input` / `values[i]` connector label.
 */
function TreeNode({
  node,
  connectorLabel,
}: {
  node: { type: string; attributes: Record<string, unknown> };
  /** Label printed above this node when it sits below a parent (e.g.
   * "input" for a chain step, "values[2]" for an aggregator item). Null on
   * the root. */
  connectorLabel: string | null;
}) {
  const entry = getCatalogEntry(node.type);
  const desc = entry?.description.split(".")[0] ?? "";
  const isLeaf = !!entry?.leaf;

  // Children to recurse into:
  // - chain types: attributes.input (if it's a nested transform)
  // - aggregators: each item of the transform-list attr
  const children: { label: string; node: { type: string; attributes: Record<string, unknown> } }[] = [];

  if (entry && !entry.leaf && !entry.aggregator) {
    const input = node.attributes.input;
    if (isNestedNode(input)) {
      children.push({ label: "input", node: input });
    }
  }
  if (entry?.aggregator) {
    const listAttr = entry.attrs.find((a) => a.t === "transform-list");
    if (listAttr) {
      const list = node.attributes[listAttr.k];
      if (Array.isArray(list)) {
        list.forEach((it, i) => {
          if (isNestedNode(it)) {
            children.push({ label: `${listAttr.k}[${i}]`, node: it });
          } else if (typeof it === "string") {
            children.push({
              label: `${listAttr.k}[${i}]`,
              node: { type: "(string)", attributes: { value: it } },
            });
          }
        });
      }
    }
  }

  return (
    <div>
      {connectorLabel && (
        <p className="pb-0.5 pl-3 font-mono text-[10px] text-muted-foreground/70">
          {connectorLabel}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <TypePill type={node.type} />
        {desc && (
          <span className="text-xs text-muted-foreground">{desc}</span>
        )}
        {isLeaf && (
          <span className="rounded border bg-muted/40 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            leaf
          </span>
        )}
      </div>
      {children.length > 0 && (
        <div className="ml-3 mt-1 space-y-1.5 border-l-2 border-amber-300/60 pl-3 dark:border-amber-700/50">
          {children.map((c, i) => (
            <TreeNode key={i} node={c.node} connectorLabel={c.label} />
          ))}
        </div>
      )}
    </div>
  );
}

function isNestedNode(
  v: unknown,
): v is { type: string; attributes: Record<string, unknown> } {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    "type" in v &&
    typeof (v as { type: unknown }).type === "string"
  );
}

// ── Test panel ───────────────────────────────────────────────────────

function TestPanel({
  draftJson,
  tenantTransforms,
}: {
  draftJson: string | null;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
}) {
  const parsed = draftJson ? safeParse(draftJson) : null;
  const [input, setInput] = React.useState<string>("");
  const [simulatedValues, setSimulatedValues] = React.useState<
    Record<string, string>
  >({});
  const [result, setResult] = React.useState<EvalResult | null>(null);

  // The transformsByName map for `reference` resolution. Real types/attrs
  // aren't loaded here (we only have id/name/type) so reference resolution
  // is best-effort: if the reference's target is in the tenant, we know
  // its type, but we can't recurse. Good enough for shallow tests.
  const transformsByName = React.useMemo(() => {
    const m = new Map<string, EvaluableTransform>();
    for (const t of tenantTransforms) {
      m.set(t.name, {
        id: t.id,
        name: t.name,
        type: t.type,
      });
    }
    return m;
  }, [tenantTransforms]);

  const requiredInputs = React.useMemo<RequiredSimulationInput[]>(() => {
    if (!parsed) return [];
    return collectRequiredInputs(
      {
        id: "__draft__",
        name: parsed.name || "(unnamed)",
        type: parsed.type ?? "",
        attributes: parsed.attributes ?? {},
      },
      transformsByName,
    );
  }, [parsed, transformsByName]);

  // Reset input sample when type changes
  React.useEffect(() => {
    if (parsed?.type) setInput(sampleFor(parsed.type));
  }, [parsed?.type]);

  function run() {
    if (!parsed) return;
    const r = evaluateTransform(
      {
        id: "__draft__",
        name: parsed.name || "(unnamed)",
        type: parsed.type ?? "",
        attributes: parsed.attributes ?? {},
      },
      input,
      { transformsByName, simulatedValues },
    );
    setResult(r);
  }

  if (!parsed) {
    return (
      <p className="text-xs text-muted-foreground">
        Fix the JSON to test the transform.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        Local evaluator — runs in your browser, not on SailPoint.
      </div>

      <section>
        <h3 className="pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Input
        </h3>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Sample input value…"
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          spellCheck={false}
        />
      </section>

      {requiredInputs.length > 0 && (
        <section>
          <h3 className="pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Simulated context
          </h3>
          <div className="space-y-1.5">
            {requiredInputs.map((req) => (
              <div key={req.id} className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {req.label}
                </span>
                <input
                  type="text"
                  value={simulatedValues[req.id] ?? ""}
                  onChange={(e) =>
                    setSimulatedValues((prev) => ({
                      ...prev,
                      [req.id]: e.currentTarget.value,
                    }))
                  }
                  placeholder={req.hint ?? ""}
                  className="h-7 flex-1 rounded border border-input bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <Button type="button" size="sm" onClick={run} className="gap-1.5">
        <Play className="h-3 w-3" />
        Run
      </Button>

      <section>
        <h3 className="pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Output
        </h3>
        {result ? (
          <pre
            className={cn(
              "max-h-72 overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed",
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900",
            )}
          >
            {result.ok ? result.output : result.error}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">Run to see output.</p>
        )}
      </section>
    </div>
  );
}

// ── Raw JSON editor (when toggled open) ──────────────────────────────

function RawJsonEditor({
  editorRef,
  value,
  setValue,
  setInsertOpen,
  setError,
  error,
  extensions,
}: {
  editorRef: React.MutableRefObject<ReactCodeMirrorRef | null>;
  value: string;
  setValue: (v: string) => void;
  setInsertOpen: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
  extensions: Extension[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setInsertOpen(true)}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Insert transform
          <kbd className="rounded border bg-muted/60 px-1 font-mono text-[10px]">
            ⌘I
          </kbd>
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
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function safeParse(jsonString: string): {
  name: string;
  type: string;
  attributes: Record<string, unknown>;
} | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    return {
      name: typeof o.name === "string" ? o.name : "",
      type: typeof o.type === "string" ? o.type : "",
      attributes:
        typeof o.attributes === "object" &&
        o.attributes !== null &&
        !Array.isArray(o.attributes)
          ? (o.attributes as Record<string, unknown>)
          : {},
    };
  } catch {
    return null;
  }
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

function mutateOrRebuild(
  prev: string,
  key: "type" | "name",
  newValue: string,
): string {
  try {
    const parsed = JSON.parse(prev) as Record<string, unknown>;
    if (key === "type") {
      parsed.type = newValue;
      if (
        typeof parsed.attributes !== "object" ||
        parsed.attributes === null ||
        Array.isArray(parsed.attributes)
      ) {
        parsed.attributes = templateFor(newValue).attributes;
      }
    } else {
      parsed.name = newValue;
    }
    if (typeof parsed.name !== "string") parsed.name = "";
    if (typeof parsed.type !== "string") parsed.type = "";
    return JSON.stringify(parsed, null, 2);
  } catch {
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
