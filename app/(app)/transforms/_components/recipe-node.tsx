"use client";

import * as React from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getCatalogEntry,
  isChainType,
  type AttrSchema,
  type CatalogEntry,
} from "@/lib/sailpoint/transforms/catalog";
import {
  chainedInput,
  defaultLeaf,
  newTransform,
  type Recipe,
  type RecipeValue,
} from "@/lib/sailpoint/transforms/recipe";

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
        onWrap={wrapInUpper}
        path={path}
        onChange={onChange}
        tenantTransforms={tenantTransforms}
        tenantSources={tenantSources}
      />
      {next ? (
        <>
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
          />
        </>
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
  onWrap,
  path,
  onChange,
  tenantTransforms,
  tenantSources,
}: {
  label: string;
  node: Recipe;
  entry: CatalogEntry | undefined;
  setType: (t: string) => void;
  setAttr: (k: string, v: unknown) => void;
  deleteAttr: (k: string) => void;
  onRemoveStep?: () => void;
  isRoot: boolean;
  onWrap: () => void;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
}) {
  const isLeaf = !!entry?.leaf;
  const isAgg = !!entry?.aggregator;

  // Inline attrs are simple form fields rendered in the card body.
  // Transform-list and kv attrs are rendered as their own groups.
  const inlineAttrs = (entry?.attrs ?? []).filter(
    (a) => a.t !== "transform-list",
  );
  const listAttrs = (entry?.attrs ?? []).filter(
    (a) => a.t === "transform-list",
  );

  return (
    <div
      className={cn(
        "rounded-md border bg-card shadow-sm",
        isRoot && "border-l-4 border-l-amber-400",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded font-mono text-[9px] font-semibold uppercase tracking-wider",
              "px-1.5 py-0.5",
              isRoot
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </span>
          <TypePicker
            value={node.type}
            onChange={setType}
            variant="compact"
            label="Type"
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

            {listAttrs.map((attr) => (
              <TransformListGroup
                key={attr.k}
                label={attr.label}
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
              />
            ))}

            {/* Add step above — root only, only when it makes sense to
                wrap (i.e., we're not already at a no-input aggregator). */}
            {isRoot && !isAgg && (
              <button
                type="button"
                onClick={onWrap}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-input bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-input hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Add step above
              </button>
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

  return (
    <div className="rounded border-t border-dashed pt-3">
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
        <span className="text-[10px] opacity-60">({schemas.length})</span>
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
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
                + Add advanced attribute
              </summary>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {remainingSchemas.map((attr) => (
                  <button
                    key={attr.k}
                    type="button"
                    onClick={() =>
                      onAttrChange(
                        attr.k,
                        (attr.default as RecipeValue | undefined) ??
                          (attr.t === "bool"
                            ? false
                            : attr.t === "number"
                              ? 0
                              : ""),
                      )
                    }
                    className="rounded border bg-background px-2 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {attr.k}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aggregator (concat / firstValid values) ──────────────────────────

function TransformListGroup({
  label,
  attrKey,
  items,
  path,
  onChange,
  tenantTransforms,
  tenantSources,
}: {
  label: string;
  attrKey: string;
  items: ReadonlyArray<RecipeValue>;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<TenantTransform>;
  tenantSources: ReadonlyArray<TenantSource>;
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
    <div>
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
          <span className="ml-1.5 font-mono text-[10px] opacity-60">
            {attrKey}
          </span>
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="space-y-2 border-l-2 border-dashed border-border pl-3">
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
