"use client";

import * as React from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getCatalogEntry,
  isChainType,
  type AttrSchema,
  type CatalogEntry,
} from "@simplified-identity/transforms";
import {
  chainedInput,
  defaultLeaf,
  newTransform,
  type Recipe,
  type RecipeValue,
} from "@simplified-identity/transforms";

import { ScalarAttr } from "./recipe-attr";
import { TypePicker } from "./type-picker";

type Path = ReadonlyArray<string | number>;
type TenantTransform = { id: string; name: string; type: string };
type TenantSource = { id: string; name: string };

type ChainProps = {
  node: Recipe;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  /** Provided on non-root steps; clicking the X removes this step from
   * the chain by deleting its parent's `input` link. */
  onRemoveStep?: () => void;
  isRoot: boolean;
  /** Header tag — "OUTPUT" on root, "INPUT" on inner steps, or a custom
   * label like "concat.values[0]" for list items. */
  label: string;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
  /**
   * Authoring mode propagated from the editor. Only used to lock the
   * root step's TypePicker in "edit" (root `type` is immutable in ISC).
   * Inner steps stay editable in both modes.
   */
  mode: "new" | "edit";
};

/**
 * Renders the recipe as a flat vertical chain of cards. The top card is
 * the OUTPUT step; each chain step (non-leaf, non-aggregator) has a dotted
 * connector below pointing at its `attributes.input` — recursively another
 * card.
 *
 * Aggregator types (concat, firstValid) render their `values` list as a
 * side group inside the card; each list item is itself a chain with its
 * own left guide.
 */
export function ChainView({
  node,
  path,
  onChange,
  onRemoveStep,
  isRoot,
  label,
  tenantTransforms,
  tenantSources,
  mode,
}: ChainProps) {
  const entry = getCatalogEntry(node.type);
  const next = entry && isChainType(node.type) ? chainedInput(node) : null;

  function setType(newType: string) {
    // Replace the whole node, seeding fresh attrs from the catalogue. We
    // intentionally drop overlapping attrs from the old type because the
    // new type has its own schema; users can paste raw JSON if they need
    // surgical edits.
    onChange(path, newTransform(newType));
  }

  function setAttr(k: string, v: unknown) {
    onChange([...path, "attributes", k], v);
  }

  function deleteAttr(k: string) {
    const nextAttrs = { ...node.attributes };
    delete nextAttrs[k];
    onChange(path, { type: node.type, attributes: nextAttrs });
  }

  function wrapInUpper() {
    // Root only: wrap the current root in a new `upper` step whose input
    // is the previous root. Becomes the new root.
    onChange(path, {
      type: "upper",
      attributes: { input: node },
    });
  }

  function insertStepBelow() {
    // Insert a new `upper` between this card and its current input. The
    // new step becomes this card's input; the previous input becomes the
    // new step's input.
    const previousInput = chainedInput(node);
    if (!previousInput) return;
    onChange([...path, "attributes", "input"], {
      type: "upper",
      attributes: { input: previousInput },
    });
  }

  // Lifted out of the card so the parent stays a simple metadata block:
  // its `values[]` sub-transforms render as sibling sub-cards, indented
  // one notch deeper.
  const listAttrs = (entry?.attrs ?? []).filter(
    (a) => a.t === "transform-list",
  );
  // transform-map declarations are virtual — they read/write the root of
  // `attrs` (any key not declared by another schema). One entry per spec
  // (e.g. conditional.bindings) but the model supports any count.
  const mapAttrs = (entry?.attrs ?? []).filter(
    (a) => a.t === "transform-map",
  );
  // Keys reserved by the spec's other attrs (plus `input`, the chain link)
  // — never shown as a binding, never overwritten by a binding edit.
  const reservedKeys = new Set<string>(
    (entry?.attrs ?? [])
      .filter((a) => a.t !== "transform-map")
      .map((a) => a.k),
  );
  reservedKeys.add("input");
  // Also reserve any advanced attr keys so users can't accidentally shadow
  // a known optional setting (e.g. requiresPeriodicRefresh) with a binding.
  for (const a of entry?.advancedAttrs ?? []) reservedKeys.add(a.k);
  const isAgg = !!entry?.aggregator;

  return (
    <div>
      <StepCard
        label={label}
        node={node}
        entry={entry}
        setType={setType}
        setAttr={setAttr}
        deleteAttr={deleteAttr}
        onRemoveStep={onRemoveStep}
        isRoot={isRoot}
        tenantTransforms={tenantTransforms}
        tenantSources={tenantSources}
        mode={mode}
      />

      {/* Sub-cards: values[] lists rendered outside the card, indented. */}
      {listAttrs.map((attr) => (
        <div key={attr.k} className="ml-6 mt-2">
          <TransformListGroup
            attrKey={attr.k}
            items={
              Array.isArray(node.attributes[attr.k])
                ? (node.attributes[attr.k] as RecipeValue[])
                : []
            }
            path={[...path, "attributes", attr.k]}
            onChange={onChange}
            tenantTransforms={tenantTransforms}
            tenantSources={tenantSources}
            mode={mode}
          />
        </div>
      ))}

      {/* Placeholder bindings — same indent pattern as values[]. */}
      {mapAttrs.map((attr) => (
        <div key={attr.k} className="ml-6 mt-2">
          <TransformMapGroup
            attr={attr}
            attrs={node.attributes}
            reservedKeys={reservedKeys}
            path={[...path, "attributes"]}
            onChange={onChange}
            tenantTransforms={tenantTransforms}
            tenantSources={tenantSources}
            mode={mode}
          />
        </div>
      ))}

      {/* Add step above — root only, when it makes sense to wrap
          (i.e., we're not already at a no-input aggregator). Hidden in
          edit mode because inserting a wrapper above the root would
          change the root's type — and root type is immutable on the
          ISC API (rejected as a PATCH). Inner step insertions remain
          available since inner types are mutable. */}
      {isRoot && !isAgg && mode === "new" && (
        <button
          type="button"
          onClick={wrapInUpper}
          className="mt-2 inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-input bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-input hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add step above
        </button>
      )}

      {next ? (
        <div className="ml-6 mt-2">
          <Connector onInsert={insertStepBelow} />
          <ChainView
            node={next}
            path={[...path, "attributes", "input"]}
            onChange={onChange}
            onRemoveStep={() => deleteAttr("input")}
            isRoot={false}
            label="INPUT"
            tenantTransforms={tenantTransforms}
            tenantSources={tenantSources}
            mode={mode}
          />
        </div>
      ) : entry && isChainType(node.type) ? (
        <AddInputButton onAdd={() => setAttr("input", defaultLeaf())} />
      ) : null}
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────

function StepCard({
  label,
  node,
  entry,
  setType,
  setAttr,
  deleteAttr,
  onRemoveStep,
  isRoot,
  tenantTransforms,
  tenantSources,
  mode,
}: {
  label: string;
  node: Recipe;
  entry: CatalogEntry | undefined;
  setType: (t: string) => void;
  setAttr: (k: string, v: unknown) => void;
  deleteAttr: (k: string) => void;
  onRemoveStep?: () => void;
  isRoot: boolean;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
  mode: "new" | "edit";
}) {
  // Root step in edit mode: ISC rejects PATCH on root `type` (the
  // transform's identity), so the picker must be locked. Inner step
  // types remain editable because they live inside `attributes` which
  // is mutable in both modes.
  const lockType = isRoot && mode === "edit";
  const isLeaf = !!entry?.leaf;

  // Inline attrs are simple form fields rendered in the card body.
  // Transform-list attrs (values[]) are rendered as sub-cards outside
  // the card by ChainView. Same for the chain `input` attr.
  const inlineAttrs = (entry?.attrs ?? []).filter(
    (a) => a.t !== "transform-list",
  );

  return (
    <div
      className={cn(
        "rounded-md border bg-card",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded font-mono text-[9px] font-semibold uppercase tracking-wider",
              "px-1.5 py-0.5 bg-muted text-muted-foreground",
            )}
          >
            {label}
          </span>
          <TypePicker
            value={node.type}
            onChange={setType}
            variant="compact"
            label="Type"
            disabled={lockType}
          />
          {entry && (
            <span className="text-[11px] text-muted-foreground line-clamp-1">
              {entry.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLeaf && (
            <span className="rounded border bg-background px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Leaf
            </span>
          )}
          {onRemoveStep && (
            <button
              type="button"
              onClick={onRemoveStep}
              aria-label="Remove step"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-3">
        {!entry ? (
          <UnsupportedNotice type={node.type} />
        ) : (
          <>
            {inlineAttrs.length > 0 && (
              <div
                className={cn(
                  "grid gap-3",
                  inlineAttrs.length >= 2 ? "sm:grid-cols-2" : "",
                )}
              >
                {inlineAttrs.map((attr) => (
                  <AttrField
                    key={attr.k}
                    attr={attr}
                    value={node.attributes[attr.k]}
                    onChange={(v) => setAttr(attr.k, v)}
                    tenantTransforms={tenantTransforms}
                    tenantSources={tenantSources}
                  />
                ))}
              </div>
            )}

            {entry.advancedAttrs && entry.advancedAttrs.length > 0 && (
              <Advanced
                schemas={entry.advancedAttrs}
                attrs={node.attributes}
                onAttrChange={(k, v) => setAttr(k, v)}
                onAttrRemove={(k) => deleteAttr(k)}
                tenantTransforms={tenantTransforms}
                tenantSources={tenantSources}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Connector ────────────────────────────────────────────────────────

function Connector({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group relative pl-4">
      {/* Dashed vertical guide — 16px tall on each side of the label. */}
      <div className="absolute left-4 top-0 h-3 border-l-2 border-dashed border-border" />
      <div className="flex items-center gap-2 py-0.5 pl-2">
        <span className="font-mono text-[10px] text-muted-foreground/70">
          input →
        </span>
        <button
          type="button"
          onClick={onInsert}
          className="inline-flex h-5 items-center gap-0.5 rounded border border-dashed border-input bg-background px-1.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
        >
          <Plus className="h-2.5 w-2.5" />
          Insert step
        </button>
      </div>
      <div className="absolute bottom-0 left-4 h-3 border-l-2 border-dashed border-border" />
    </div>
  );
}

function AddInputButton({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="pl-4">
      <div className="ml-0 border-l-2 border-dashed border-border pl-3 py-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-input bg-background px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add input source
        </button>
      </div>
    </div>
  );
}

// ── Inline attr field ────────────────────────────────────────────────

function AttrField({
  attr,
  value,
  onChange,
  tenantTransforms,
  tenantSources,
}: {
  attr: AttrSchema;
  value: RecipeValue | undefined;
  onChange: (v: unknown) => void;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
}) {
  return (
    <div>
      <label className="block pb-1 text-[11px] font-medium text-muted-foreground">
        {attr.label}
        {attr.required && <span className="text-rose-600"> *</span>}
        {attr.hint && (
          <span className="ml-2 text-[10px] font-normal text-muted-foreground/70">
            {attr.hint}
          </span>
        )}
      </label>
      <ScalarAttr
        schema={attr}
        value={value}
        onChange={onChange}
        tenantTransforms={tenantTransforms}
        tenantSources={tenantSources}
      />
    </div>
  );
}

// ── Advanced ─────────────────────────────────────────────────────────

function Advanced({
  schemas,
  attrs,
  onAttrChange,
  onAttrRemove,
  tenantTransforms,
  tenantSources,
}: {
  schemas: AttrSchema[];
  attrs: Record<string, RecipeValue>;
  onAttrChange: (k: string, v: unknown) => void;
  onAttrRemove: (k: string) => void;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
}) {
  const setSchemas = schemas.filter((a) => a.k in attrs);
  const remainingSchemas = schemas.filter((a) => !(a.k in attrs));
  const [open, setOpen] = React.useState(setSchemas.length > 0);

  if (schemas.length === 0) return null;

  function defaultForSchema(attr: AttrSchema): RecipeValue {
    if (attr.default !== undefined) return attr.default as RecipeValue;
    if (attr.t === "bool") return false;
    if (attr.t === "number") return 0;
    if (attr.t === "kv") return {} as RecipeValue;
    return "";
  }

  return (
    <div className="border-t border-dashed pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
        Advanced
        <span className="font-mono text-[10px] opacity-60">
          {setSchemas.length === 0
            ? `${schemas.length} available`
            : `${setSchemas.length} of ${schemas.length} set`}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2.5">
          {setSchemas.map((attr) => (
            <div key={attr.k} className="flex items-end gap-1.5">
              <div className="flex-1">
                <AttrField
                  attr={attr}
                  value={attrs[attr.k]}
                  onChange={(v) => onAttrChange(attr.k, v)}
                  tenantTransforms={tenantTransforms}
                  tenantSources={tenantSources}
                />
              </div>
              <button
                type="button"
                onClick={() => onAttrRemove(attr.k)}
                aria-label={`Remove ${attr.label}`}
                className="mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {remainingSchemas.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-input bg-background px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Plus className="h-3 w-3" />
                Add attribute
                <span className="font-mono text-[10px] opacity-60">
                  ({remainingSchemas.length})
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-72 w-72 overflow-y-auto"
              >
                {remainingSchemas.map((attr) => (
                  <DropdownMenuItem
                    key={attr.k}
                    onSelect={() =>
                      onAttrChange(attr.k, defaultForSchema(attr))
                    }
                    className="flex flex-col items-start gap-0.5 py-1.5"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px]">{attr.k}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {attr.t}
                      </span>
                    </span>
                    {attr.hint && (
                      <span className="text-[10px] text-muted-foreground">
                        {attr.hint}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aggregator (concat / firstValid values) ──────────────────────────

function TransformListGroup({
  attrKey,
  items,
  path,
  onChange,
  tenantTransforms,
  tenantSources,
  mode,
}: {
  attrKey: string;
  items: ReadonlyArray<RecipeValue>;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
  mode: "new" | "edit";
}) {
  function replaceItem(i: number, next: RecipeValue) {
    const newList = items.slice();
    newList[i] = next;
    onChange(path, newList);
  }

  function removeItem(i: number) {
    const newList = items.slice();
    newList.splice(i, 1);
    onChange(path, newList);
  }

  function addString() {
    onChange(path, [...items, ""]);
  }

  function addTransform() {
    onChange(path, [...items, defaultLeaf()]);
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[11px] italic text-muted-foreground/70">
          No values yet — add a string or a transform below.
        </p>
      )}
      {items.map((item, i) => {
        const itemPath: Path = [...path, i];
        if (typeof item === "string") {
          return (
            <StringRow
              key={i}
              index={i}
              value={item}
              onChange={(v) => replaceItem(i, v)}
              onRemove={() => removeItem(i)}
              onConvertToTransform={() =>
                replaceItem(i, defaultLeaf() as RecipeValue)
              }
            />
          );
        }
        if (
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item) &&
          "type" in item &&
          "attributes" in item
        ) {
          return (
            <ChainView
              key={i}
              node={item as Recipe}
              path={itemPath}
              onChange={onChange}
              onRemoveStep={() => removeItem(i)}
              isRoot={false}
              label={`${attrKey}[${i}]`}
              tenantTransforms={tenantTransforms}
              tenantSources={tenantSources}
              mode={mode}
            />
          );
        }
        return null;
      })}
      <div className="flex items-center gap-1 pt-1">
        <button
          type="button"
          onClick={addString}
          className="inline-flex h-6 items-center gap-1 rounded border border-input bg-background px-2 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" />
          String
        </button>
        <button
          type="button"
          onClick={addTransform}
          className="inline-flex h-6 items-center gap-1 rounded border border-input bg-background px-2 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" />
          Transform
        </button>
      </div>
    </div>
  );
}

function StringRow({
  index,
  value,
  onChange,
  onRemove,
  onConvertToTransform,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  onConvertToTransform: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Str {index + 1}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder='Static string, e.g. " · "'
        className="h-7 flex-1 rounded border border-input bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={onConvertToTransform}
        className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        title="Convert to a transform"
      >
        → transform
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Placeholder bindings (transform-map) ─────────────────────────────

/**
 * Renders a `transform-map` attr: arbitrary user-named keys at the ROOT of
 * `attrs` that aren't claimed by any other declared schema. Each row binds
 * one placeholder to either a primitive value or a sub-transform.
 *
 * Round-trip note: the bindings live at the root of `attrs` (SailPoint-
 * native convention). The control reads/writes those keys directly — no
 * sub-path indirection.
 *
 * Draft state: a row whose `key` field is empty or collides with a reserved
 * key (or with another row) is held in local state and NOT committed to
 * `attrs` until it becomes valid. This lets the user type a new key without
 * accidentally creating `attrs[""]` or shadowing a declared attr.
 */
function TransformMapGroup({
  attr,
  attrs,
  reservedKeys,
  path,
  onChange,
  tenantTransforms,
  tenantSources,
  mode,
}: {
  attr: AttrSchema;
  attrs: Record<string, RecipeValue>;
  reservedKeys: ReadonlySet<string>;
  /** Path to the parent `attributes` object — bindings are written as
   * `[...path, <key>]`. */
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
  mode: "new" | "edit";
}) {
  // Committed bindings come straight from `attrs` (the JSON source of
  // truth). Iteration order matches Object.keys, which preserves insertion
  // order in modern engines — stable enough for v0.
  const committedKeys = React.useMemo(
    () => Object.keys(attrs).filter((k) => !reservedKeys.has(k)),
    [attrs, reservedKeys],
  );

  // Draft rows — rows whose key is invalid (empty, reserved, duplicated).
  // Stored as a list keeping insertion order. Each has a stable id so React
  // keys remain consistent across edits.
  type DraftRow = {
    id: string;
    draftKey: string;
    value: RecipeValue;
  };
  const [drafts, setDrafts] = React.useState<DraftRow[]>([]);

  const nextDraftId = React.useRef(0);
  const mkDraftId = () => `draft-${++nextDraftId.current}`;

  const committedKeySet = React.useMemo(
    () => new Set(committedKeys),
    [committedKeys],
  );

  function isKeyValid(k: string): boolean {
    if (k === "") return false;
    if (reservedKeys.has(k)) return false;
    if (committedKeySet.has(k)) return false;
    return true;
  }

  function addBinding() {
    setDrafts((d) => [
      ...d,
      { id: mkDraftId(), draftKey: "", value: "" },
    ]);
  }

  function removeCommitted(k: string) {
    const next = { ...attrs };
    delete next[k];
    // `path` points at the attributes object itself, so writing the whole
    // map there is the deletion mechanism (setIn doesn't support deletes).
    onChange(path, next);
  }

  function removeDraft(id: string) {
    setDrafts((d) => d.filter((r) => r.id !== id));
  }

  function renameCommitted(oldKey: string, newKey: string) {
    if (newKey === oldKey) return;
    // Invalid new key — demote to draft, drop from attrs.
    if (!isKeyValid(newKey)) {
      const value = attrs[oldKey] ?? "";
      const next = { ...attrs };
      delete next[oldKey];
      // Demote: drop from attrs first, then add the draft row so the user
      // can keep editing.
      onChange(path, next);
      setDrafts((d) => [
        ...d,
        { id: mkDraftId(), draftKey: newKey, value },
      ]);
      return;
    }
    // Rename atomically — preserve order best-effort by rebuilding.
    const next: Record<string, RecipeValue> = {};
    for (const [k, v] of Object.entries(attrs)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(path, next);
  }

  function updateDraftKey(id: string, newKey: string) {
    const row = drafts.find((r) => r.id === id);
    if (!row) return;
    if (isKeyValid(newKey)) {
      // Promote to committed: write attrs[newKey] = value, drop the draft.
      const next = { ...attrs, [newKey]: row.value };
      onChange(path, next);
      setDrafts((d) => d.filter((r) => r.id !== id));
      return;
    }
    setDrafts((d) =>
      d.map((r) => (r.id === id ? { ...r, draftKey: newKey } : r)),
    );
  }

  function updateDraftValue(id: string, value: RecipeValue) {
    setDrafts((d) => d.map((r) => (r.id === id ? { ...r, value } : r)));
  }

  function setCommittedValue(k: string, value: RecipeValue) {
    onChange([...path, k], value);
  }

  // Type-toggle helpers: cleanly switch a row between primitive and
  // sub-transform. The contract is "best-effort preserve" — when going
  // primitive → transform, we seed a fresh static template; transform →
  // primitive resets to empty string (the previous transform is lost).
  function toggleCommittedToTransform(k: string) {
    setCommittedValue(k, makeStaticTemplate(""));
  }
  function toggleCommittedToPrimitive(k: string) {
    setCommittedValue(k, "");
  }
  function toggleDraftToTransform(id: string) {
    updateDraftValue(id, makeStaticTemplate(""));
  }
  function toggleDraftToPrimitive(id: string) {
    updateDraftValue(id, "");
  }

  // Track which draft keys are duplicates of *other* drafts (for inline
  // hint rendering). We don't try to display this for committed rows since
  // by definition they all live under distinct keys in `attrs`.
  const draftKeyCounts = React.useMemo(() => {
    const c = new Map<string, number>();
    for (const r of drafts) {
      c.set(r.draftKey, (c.get(r.draftKey) ?? 0) + 1);
    }
    return c;
  }, [drafts]);

  const totalRows = committedKeys.length + drafts.length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {attr.label}
        </p>
        {totalRows > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground/70">
            ({totalRows})
          </span>
        )}
      </div>
      {attr.description && (
        <p className="text-[11px] text-muted-foreground/80">
          {attr.description}
        </p>
      )}

      {totalRows === 0 ? (
        <p className="text-[11px] italic text-muted-foreground/70">
          No placeholder bindings. Add one to bind a $name from the expression.
        </p>
      ) : (
        <div className="space-y-1.5">
          {committedKeys.map((k) => {
            const v = attrs[k];
            const isTransform = isNestedRecipe(v);
            return (
              <BindingRow
                key={`c-${k}`}
                rowKey={k}
                value={v}
                isTransform={isTransform}
                onKeyChange={(next) => renameCommitted(k, next)}
                onValueChange={(next) => setCommittedValue(k, next)}
                onToggleToTransform={() => toggleCommittedToTransform(k)}
                onToggleToPrimitive={() => toggleCommittedToPrimitive(k)}
                onRemove={() => removeCommitted(k)}
                keyError={null}
                tenantTransforms={tenantTransforms}
                tenantSources={tenantSources}
                mode={mode}
                bindingPath={[...path, k]}
                onChange={onChange}
              />
            );
          })}
          {drafts.map((r) => {
            const reason = keyErrorMessage(
              r.draftKey,
              reservedKeys,
              committedKeySet,
              (draftKeyCounts.get(r.draftKey) ?? 0) > 1,
            );
            const isTransform = isNestedRecipe(r.value);
            return (
              <BindingRow
                key={r.id}
                rowKey={r.draftKey}
                value={r.value}
                isTransform={isTransform}
                onKeyChange={(next) => updateDraftKey(r.id, next)}
                onValueChange={(next) => updateDraftValue(r.id, next)}
                onToggleToTransform={() => toggleDraftToTransform(r.id)}
                onToggleToPrimitive={() => toggleDraftToPrimitive(r.id)}
                onRemove={() => removeDraft(r.id)}
                keyError={reason}
                tenantTransforms={tenantTransforms}
                tenantSources={tenantSources}
                mode={mode}
                // Drafts aren't backed by a real attrs key — pass the path
                // anyway so ChainView can mount; nested edits flow through
                // `onValueChange` since we route via path.slice(-1).
                bindingPath={null}
                onChange={onChange}
              />
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addBinding}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-input bg-background px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add binding
      </button>
    </div>
  );
}

function makeStaticTemplate(value: string): Recipe {
  return { type: "static", attributes: { value } };
}

function isNestedRecipe(value: RecipeValue | undefined): value is Recipe {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "type" in (value as Record<string, unknown>) &&
    typeof (value as { type: unknown }).type === "string" &&
    "attributes" in (value as Record<string, unknown>)
  );
}

function keyErrorMessage(
  k: string,
  reserved: ReadonlySet<string>,
  committed: ReadonlySet<string>,
  isDuplicateDraft: boolean,
): string | null {
  if (k === "") return "Enter a placeholder name to commit this binding.";
  if (reserved.has(k))
    return `"${k}" is reserved by the spec — pick a different name.`;
  if (committed.has(k))
    return `"${k}" is already used by another binding.`;
  if (isDuplicateDraft)
    return `"${k}" is used by another pending row — pick a different name.`;
  return null;
}

function BindingRow({
  rowKey,
  value,
  isTransform,
  onKeyChange,
  onValueChange,
  onToggleToTransform,
  onToggleToPrimitive,
  onRemove,
  keyError,
  tenantTransforms,
  tenantSources,
  mode,
  bindingPath,
  onChange,
}: {
  rowKey: string;
  value: RecipeValue | undefined;
  isTransform: boolean;
  onKeyChange: (next: string) => void;
  onValueChange: (next: RecipeValue) => void;
  onToggleToTransform: () => void;
  onToggleToPrimitive: () => void;
  onRemove: () => void;
  keyError: string | null;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
  mode: "new" | "edit";
  /** Path to the value in the recipe — null for draft rows (not yet
   * committed to attrs). When null, the nested ChainView still renders
   * but its writes route through `onValueChange` instead of the global
   * `onChange` path-addressing. */
  bindingPath: Path | null;
  onChange: (path: Path, value: unknown) => void;
}) {
  return (
    <div className="rounded-md border bg-card px-2 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          $
        </span>
        <input
          type="text"
          value={rowKey}
          onChange={(e) => onKeyChange(e.currentTarget.value)}
          placeholder="placeholder name"
          className={cn(
            "h-7 w-40 rounded border bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            keyError
              ? "border-amber-400 focus-visible:ring-amber-400"
              : "border-input",
          )}
          spellCheck={false}
        />
        <div className="inline-flex h-7 items-center rounded border border-input bg-background p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => {
              if (isTransform) onToggleToPrimitive();
            }}
            className={cn(
              "h-6 rounded px-2 font-medium transition-colors",
              !isTransform
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Primitive
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isTransform) onToggleToTransform();
            }}
            className={cn(
              "h-6 rounded px-2 font-medium transition-colors",
              isTransform
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Transform
          </button>
        </div>
        {!isTransform && (
          <input
            type="text"
            value={
              typeof value === "string"
                ? value
                : value === undefined || value === null
                  ? ""
                  : String(value)
            }
            onChange={(e) => onValueChange(e.currentTarget.value)}
            placeholder="value"
            className="h-7 flex-1 rounded border border-input bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            spellCheck={false}
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove binding"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {keyError && (
        <p className="pl-5 text-[10px] text-amber-700 dark:text-amber-300">
          {keyError}
        </p>
      )}
      {isTransform && isNestedRecipe(value) && (
        <div className="ml-5 mt-1">
          {bindingPath ? (
            <ChainView
              node={value}
              path={bindingPath}
              onChange={onChange}
              isRoot={false}
              label={rowKey ? `$${rowKey}` : "BINDING"}
              tenantTransforms={tenantTransforms}
              tenantSources={tenantSources}
              mode={mode}
            />
          ) : (
            // Draft rows aren't backed by a real attrs path. Route nested
            // edits through `onValueChange` by feeding ChainView a scoped
            // updater that walks the local value tree.
            <ChainView
              node={value}
              path={[]}
              onChange={(subPath, v) => {
                const next = applyAtLocalPath(value, subPath, v);
                onValueChange(next as RecipeValue);
              }}
              isRoot={false}
              label={rowKey ? `$${rowKey}` : "BINDING"}
              tenantTransforms={tenantTransforms}
              tenantSources={tenantSources}
              mode={mode}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Local path-update helper for draft binding values. Mirrors
 * `updateAt` from recipe.ts but operates on a single value without
 * needing the global root. Used so a draft row whose value is a nested
 * transform can still be edited inline before the row's key commits.
 */
function applyAtLocalPath(
  node: unknown,
  path: ReadonlyArray<string | number>,
  value: unknown,
): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    if (!Array.isArray(node)) return node;
    const copy = [...node];
    copy[head] = applyAtLocalPath(copy[head], rest, value);
    return copy;
  }
  if (typeof node !== "object" || node === null) return node;
  const copy: Record<string, unknown> = { ...(node as Record<string, unknown>) };
  copy[head] = applyAtLocalPath(copy[head], rest, value);
  return copy;
}

// ── Unsupported notice ───────────────────────────────────────────────

function UnsupportedNotice({ type }: { type: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">
        Type &ldquo;{type || "—"}&rdquo; isn&apos;t in the local catalogue.
      </p>
      <p className="mt-1">
        Switch to <span className="font-medium">JSON</span> in the side panel
        to edit, or pick a known type from the picker above.
      </p>
    </div>
  );
}
