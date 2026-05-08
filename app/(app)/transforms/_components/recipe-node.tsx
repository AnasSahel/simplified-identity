"use client";

import * as React from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getCatalogEntry,
  type AttrSchema,
  type CatalogEntry,
} from "@/lib/sailpoint/transforms/catalog";
import { templateFor } from "@/lib/sailpoint/transforms/templates";
import type { Recipe, RecipeValue } from "@/lib/sailpoint/transforms/recipe";

import { ScalarAttr } from "./recipe-attr";
import { TypePicker } from "./type-picker";

type Path = ReadonlyArray<string | number>;

export type RecipeNodeProps = {
  node: Recipe;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  /** Optional handler — when set, a delete button shows in the header. Root has none. */
  onRemove?: () => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
  /** Show a small label above the card (e.g. "Item 1" inside a transform-list). */
  label?: string;
};

export function RecipeNode({
  node,
  path,
  onChange,
  onRemove,
  tenantTransforms,
  tenantSources,
  label,
}: RecipeNodeProps) {
  const entry = getCatalogEntry(node.type);

  function setType(newType: string) {
    // Swap type, seed attributes from the new type's template (only for
    // attrs that are missing from current attributes — keep what overlaps).
    const tmpl = templateFor(newType).attributes ?? {};
    const merged: Record<string, unknown> = { ...tmpl, ...node.attributes };
    onChange(path, { type: newType, attributes: merged });
  }

  return (
    <div className="space-y-1">
      {label && (
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
      )}
      <div className="rounded-md border bg-card p-3 shadow-sm">
        <header className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
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
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove transform"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </header>

        {!entry ? (
          <UnsupportedNotice type={node.type} />
        ) : (
          <NodeBody
            entry={entry}
            node={node}
            path={path}
            onChange={onChange}
            tenantTransforms={tenantTransforms}
            tenantSources={tenantSources}
          />
        )}
      </div>
    </div>
  );
}

function NodeBody({
  entry,
  node,
  path,
  onChange,
  tenantTransforms,
  tenantSources,
}: {
  entry: CatalogEntry;
  node: Recipe;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
}) {
  return (
    <>
      {entry.attrs.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {entry.attrs.map((attr) => (
            <AttrRow
              key={attr.k}
              attr={attr}
              value={node.attributes[attr.k]}
              onChange={(v) =>
                onChange([...path, "attributes", attr.k], v)
              }
              path={[...path, "attributes", attr.k]}
              parentOnChange={onChange}
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
          onAttrChange={(k, v) =>
            onChange([...path, "attributes", k], v)
          }
          tenantTransforms={tenantTransforms}
          tenantSources={tenantSources}
        />
      )}
    </>
  );
}

function AttrRow({
  attr,
  value,
  onChange,
  path,
  parentOnChange,
  tenantTransforms,
  tenantSources,
}: {
  attr: AttrSchema;
  value: RecipeValue | undefined;
  onChange: (v: unknown) => void;
  path: Path;
  parentOnChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
}) {
  if (attr.t === "transform-list") {
    return (
      <TransformListAttr
        attr={attr}
        value={value}
        path={path}
        onChange={parentOnChange}
        tenantTransforms={tenantTransforms}
        tenantSources={tenantSources}
      />
    );
  }
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

function Advanced({
  schemas,
  attrs,
  onAttrChange,
  tenantTransforms,
  tenantSources,
}: {
  schemas: AttrSchema[];
  attrs: Record<string, RecipeValue>;
  onAttrChange: (k: string, v: unknown) => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-3 border-t pt-2">
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
          {schemas.map((attr) => (
            <div key={attr.k}>
              <label className="block pb-1 text-[11px] font-medium text-muted-foreground">
                {attr.label}
                {attr.hint && (
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground/70">
                    {attr.hint}
                  </span>
                )}
              </label>
              <ScalarAttr
                schema={attr}
                value={attrs[attr.k]}
                onChange={(v) => onAttrChange(attr.k, v)}
                tenantTransforms={tenantTransforms}
                tenantSources={tenantSources}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnsupportedNotice({ type }: { type: string }) {
  return (
    <div className="mt-3 rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">
        Type &ldquo;{type || "—"}&rdquo; isn&apos;t in the local catalogue.
      </p>
      <p className="mt-1">
        Switch to <span className="font-medium">Raw JSON</span> to edit this
        transform, or pick a known type from the picker above.
      </p>
    </div>
  );
}

// ── transform-list ────────────────────────────────────────────────────

function TransformListAttr({
  attr,
  value,
  path,
  onChange,
  tenantTransforms,
  tenantSources,
}: {
  attr: AttrSchema;
  value: RecipeValue | undefined;
  path: Path;
  onChange: (path: Path, value: unknown) => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
}) {
  const list = Array.isArray(value) ? value : [];

  function replaceItem(i: number, next: RecipeValue) {
    const newList = list.slice();
    newList[i] = next;
    onChange(path, newList);
  }

  function removeItem(i: number) {
    const newList = list.slice();
    newList.splice(i, 1);
    onChange(path, newList);
  }

  function addString() {
    onChange(path, [...list, ""]);
  }

  function addTransform() {
    onChange(path, [...list, (templateFor("upper") as Recipe)]);
  }

  return (
    <div>
      <label className="block pb-1 text-[11px] font-medium text-muted-foreground">
        {attr.label}
        {attr.required && <span className="text-rose-600"> *</span>}
        <span className="ml-2 text-[10px] font-normal text-muted-foreground/70">
          {list.length} {list.length === 1 ? "item" : "items"}
        </span>
      </label>
      <div className="space-y-2 border-l-2 border-dashed border-border pl-3">
        {list.map((item, i) => {
          const itemPath = [...path, i];
          if (typeof item === "string") {
            return (
              <StringRow
                key={i}
                index={i}
                value={item}
                onChange={(v) => replaceItem(i, v)}
                onRemove={() => removeItem(i)}
                onConvertToTransform={() =>
                  replaceItem(i, (templateFor("upper") as Recipe))
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
              <RecipeNode
                key={i}
                node={item as Recipe}
                path={itemPath}
                onChange={onChange}
                onRemove={() => removeItem(i)}
                tenantTransforms={tenantTransforms}
                tenantSources={tenantSources}
                label={`Item ${i + 1}`}
              />
            );
          }
          // Unknown item shape — fall back to a compact JSON string editor
          return (
            <StringRow
              key={i}
              index={i}
              value={JSON.stringify(item)}
              onChange={(v) => {
                try {
                  replaceItem(i, JSON.parse(v) as RecipeValue);
                } catch {
                  /* keep typing */
                }
              }}
              onRemove={() => removeItem(i)}
              onConvertToTransform={() =>
                replaceItem(i, (templateFor("upper") as Recipe))
              }
            />
          );
        })}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addString}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            String
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTransform}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Transform
          </Button>
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
    <div className="flex items-center gap-1.5 rounded-md border bg-card p-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
