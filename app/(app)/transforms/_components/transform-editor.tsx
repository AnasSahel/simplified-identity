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
  ChevronRight,
  Loader2,
  Play,
  Save,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  jsonToRecipe,
  recipeToJson,
  type RootRecipe,
} from "@/lib/sailpoint/transforms/recipe";
import { TRANSFORM_REGISTRY } from "@/lib/sailpoint/transforms/registry";
import {
  collectRequiredInputs,
  evaluateTransform,
  type EvalResult,
  type EvaluableTransform,
  type RequiredSimulationInput,
} from "@/lib/sailpoint/transform-evaluator";
import { sampleFor } from "@/lib/sailpoint/transform-samples";

import { JsonPanel } from "./json-panel";
import { RecipeTree } from "./recipe-tree";
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
import { TypePicker } from "./type-picker";
import { TypePill } from "../../_components/type-pill";
import {
  attributesMatchTemplate,
  deriveAttributes,
  deriveRoot,
  mutateOrRebuild,
} from "./transform-editor-shared";

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
  const derived = React.useMemo(() => deriveRoot(value), [value]);

  // Collision pre-check (client-side hint only — server confirms on submit).
  // In edit mode, ignore the current transform's own name from the taken set.
  const takenNames = React.useMemo(() => {
    const s = new Set<string>();
    for (const t of tenantTransforms) {
      if (mode.kind === "edit" && t.id === mode.id) continue;
      s.add(t.name);
    }
    return s;
  }, [tenantTransforms, mode]);
  const nameTrimmed = derived.name.trim();
  const nameCollides =
    mode.kind === "new" && nameTrimmed !== "" && takenNames.has(nameTrimmed);

  const canSave =
    !pending &&
    localValidation.ok &&
    nameTrimmed !== "" &&
    (derived.type ?? "").trim() !== "" &&
    !nameCollides &&
    (mode.kind === "new" ? value.trim().length > 0 : dirty);

  // Pending type change awaiting user confirmation in the "reset attrs" dialog.
  const [pendingTypeChange, setPendingTypeChange] = React.useState<
    string | null
  >(null);

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

  function requestTypeChange(newType: string) {
    // Edit mode: type is locked. Defensive guard — the picker shouldn't
    // even be reachable, but never trust the UI.
    if (mode.kind === "edit") return;
    const currentType = derived.type ?? "";
    if (newType === currentType) return;
    const currentAttrs = deriveAttributes(value);
    if (attributesMatchTemplate(currentType, currentAttrs)) {
      // Nothing to lose — seed silently.
      setValue((prev) =>
        mutateOrRebuild(prev, "type", newType, { forceSeedAttributes: true }),
      );
      return;
    }
    // Custom attributes present — ask before discarding.
    setPendingTypeChange(newType);
  }

  function confirmTypeChange() {
    if (!pendingTypeChange) return;
    const newType = pendingTypeChange;
    setPendingTypeChange(null);
    setValue((prev) =>
      mutateOrRebuild(prev, "type", newType, { forceSeedAttributes: true }),
    );
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
  const typeEmpty =
    derived.type === null || derived.type.trim().length === 0;
  const issuesCount =
    (nameEmpty ? 1 : 0) +
    (nameCollides ? 1 : 0) +
    (mode.kind === "new" && typeEmpty ? 1 : 0) +
    (localValidation.ok ? 0 : 1) +
    (error ? 1 : 0);

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
                <GeneralFields
                  mode={mode}
                  derived={derived}
                  nameEmpty={nameEmpty}
                  nameCollides={nameCollides}
                  onNameChange={setRootName}
                  onTypeChange={requestTypeChange}
                />
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

      <AlertDialog
        open={pendingTypeChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTypeChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset attributes?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching the transform type to{" "}
              <span className="font-mono">{pendingTypeChange}</span> will
              replace the current <span className="font-mono">attributes</span>{" "}
              with the default template. Your edits to attributes will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTypeChange(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTypeChange}>
              Reset attributes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── General fields (name + type) ─────────────────────────────────────

function GeneralFields({
  mode,
  derived,
  nameEmpty,
  nameCollides,
  onNameChange,
  onTypeChange,
}: {
  mode: Mode;
  derived: { type: string | null; name: string };
  nameEmpty: boolean;
  nameCollides: boolean;
  onNameChange: (v: string) => void;
  onTypeChange: (t: string) => void;
}) {
  const isEdit = mode.kind === "edit";
  const typeKnown =
    derived.type !== null && TRANSFORM_REGISTRY[derived.type] !== undefined;

  return (
    <>
      <div>
        <label className="block pb-1 text-[11px] font-medium text-muted-foreground">
          Name {!isEdit && <span className="text-rose-600">*</span>}
        </label>
        <input
          type="text"
          value={derived.name}
          onChange={(e) => onNameChange(e.currentTarget.value)}
          placeholder="trf-my-transform"
          disabled={isEdit}
          className={cn(
            "h-9 w-full rounded-md border bg-background px-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1",
            nameEmpty && !isEdit
              ? "border-rose-500 focus-visible:ring-rose-500"
              : nameCollides
              ? "border-rose-500 focus-visible:ring-rose-500"
              : "border-input focus-visible:ring-ring",
            isEdit && "cursor-not-allowed text-muted-foreground opacity-80",
          )}
          spellCheck={false}
          aria-readonly={isEdit}
        />
        {!isEdit && nameEmpty && (
          <p className="pt-1 text-[11px] text-rose-600">Name is required</p>
        )}
        {!isEdit && !nameEmpty && nameCollides && (
          <p className="pt-1 text-[11px] text-rose-600">
            Name already exists in the tenant
          </p>
        )}
      </div>

      <div>
        <label className="block pb-1 text-[11px] font-medium text-muted-foreground">
          Type {!isEdit && <span className="text-rose-600">*</span>}
        </label>
        {isEdit ? (
          <div className="flex h-9 items-center">
            {typeKnown && derived.type ? (
              <TypePill type={derived.type} />
            ) : (
              <span className="font-mono text-xs text-muted-foreground">
                {derived.type ?? "—"}
                {derived.type && !typeKnown ? " (unknown)" : ""}
              </span>
            )}
          </div>
        ) : (
          <div>
            <TypePicker
              value={derived.type}
              onChange={onTypeChange}
              label="Pick a type"
            />
            {(derived.type === null || derived.type.trim() === "") && (
              <p className="pt-1 text-[11px] text-rose-600">
                Type is required
              </p>
            )}
          </div>
        )}
      </div>

      {isEdit && (
        <p className="text-[11px] text-muted-foreground">
          Name and type are immutable after creation in SailPoint ISC.
        </p>
      )}
    </>
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
    <RecipeTree
      node={{ type: parsed.type, attributes: parsed.attributes }}
      caption="The transform recipe, simplified."
    />
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
                  onChange={(e) => {
                    // Capture before the setState callback — React's
                    // SyntheticEvent reuses `currentTarget` and nulls it
                    // out by the time the updater runs.
                    const v = e.currentTarget.value;
                    setSimulatedValues((prev) => ({ ...prev, [req.id]: v }));
                  }}
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

// deriveRoot, mutateOrRebuild, attributesMatchTemplate live in
// transform-editor-shared.ts — pure helpers reusable by other editors.
