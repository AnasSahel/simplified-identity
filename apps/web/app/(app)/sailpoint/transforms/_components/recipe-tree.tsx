"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCatalogEntry } from "@simplified-identity/transforms";

import { TypePill } from "../../../_components/type-pill";

type TreeNodeData = {
  type: string;
  attributes: Record<string, unknown>;
};

type RefTarget = { id: string; name: string; type: string };

export type RecipeTreeProps = {
  node: TreeNodeData;
  /** Lookup table for `reference` cross-refs. When provided AND
   * `onSelectReference` is set, reference nodes render a clickable
   * pill that lets the user dive into the referenced transform. */
  transformsByName?: ReadonlyMap<string, RefTarget>;
  onSelectReference?: (transformId: string) => void;
  /** Optional caption shown above the tree. */
  caption?: string;
};

/**
 * Recursive plain-tree renderer for a transform recipe. Each node is one
 * row (type pill + short description); children get an indent + amber
 * dashed guide on the left and a tiny `input` / `values[i]` connector
 * label.
 *
 * `reference` nodes are rendered as a button when their target is found
 * in `transformsByName` and `onSelectReference` is set — the caller is
 * responsible for the navigation.
 */
export function RecipeTree({
  node,
  transformsByName,
  onSelectReference,
  caption,
}: RecipeTreeProps) {
  return (
    <div>
      {caption && (
        <p className="pb-3 text-[11px] text-muted-foreground">{caption}</p>
      )}
      <RecipeTreeNode
        node={node}
        connectorLabel={null}
        transformsByName={transformsByName}
        onSelectReference={onSelectReference}
      />
    </div>
  );
}

function RecipeTreeNode({
  node,
  connectorLabel,
  transformsByName,
  onSelectReference,
}: {
  node: TreeNodeData;
  /** Label printed above this node when it sits below a parent (e.g.
   * "input" for a chain step, "values[2]" for an aggregator item). Null
   * on the root. */
  connectorLabel: string | null;
  transformsByName?: ReadonlyMap<string, RefTarget>;
  onSelectReference?: (transformId: string) => void;
}) {
  const entry = getCatalogEntry(node.type);
  const desc = entry?.description.split(".")[0] ?? "";
  const isLeaf = !!entry?.leaf;

  // Children to recurse into:
  // - chain types: attributes.input (if it's a nested transform)
  // - aggregators: each item of the transform-list attr
  const children: { label: string; node: TreeNodeData }[] = [];

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

  // transform-map bindings: any attr key not declared by the catalog (and
  // not `input`) is a placeholder binding. Bindings whose value is a nested
  // transform recurse into the tree; primitive bindings render as a leaf
  // stub so the user sees the binding name in the graph view.
  if (entry?.attrs.some((a) => a.t === "transform-map")) {
    const declaredKeys = new Set<string>(
      entry.attrs.filter((a) => a.t !== "transform-map").map((a) => a.k),
    );
    declaredKeys.add("input");
    for (const [k, v] of Object.entries(node.attributes)) {
      if (declaredKeys.has(k)) continue;
      if (isNestedNode(v)) {
        children.push({ label: `$${k}`, node: v });
      } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        children.push({
          label: `$${k}`,
          node: { type: "(primitive)", attributes: { value: v } },
        });
      }
    }
  }

  // Reference cross-ref: if this node is `reference` and its target is
  // in the lookup map, the caller can offer click-to-navigate.
  const refTarget =
    node.type === "reference" && transformsByName
      ? findRefTarget(node.attributes, transformsByName)
      : null;
  const refClickable = refTarget && onSelectReference;

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
        {refTarget && (
          <button
            type="button"
            disabled={!refClickable}
            onClick={() => refClickable && onSelectReference(refTarget.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded border bg-card px-1.5 py-0.5 font-mono text-[10px] transition-colors",
              refClickable
                ? "cursor-pointer text-foreground hover:bg-accent"
                : "cursor-default text-muted-foreground",
            )}
            title={
              refClickable
                ? `Open ${refTarget.name}`
                : `Reference to ${refTarget.name}`
            }
          >
            → {refTarget.name}
            {refClickable && <ExternalLink className="h-2.5 w-2.5" />}
          </button>
        )}
      </div>
      {children.length > 0 && (
        <div className="ml-3 mt-1 space-y-1.5 border-l-2 border-amber-300/60 pl-3 dark:border-amber-700/50">
          {children.map((c, i) => (
            <RecipeTreeNode
              key={i}
              node={c.node}
              connectorLabel={c.label}
              transformsByName={transformsByName}
              onSelectReference={onSelectReference}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function findRefTarget(
  attrs: Record<string, unknown>,
  transformsByName: ReadonlyMap<string, RefTarget>,
): RefTarget | null {
  // SailPoint's `reference` uses `id` for the *name* of the target
  // transform (it's a misleading field name).
  const id = attrs.id;
  const name = attrs.name;
  const key = typeof id === "string" ? id : typeof name === "string" ? name : null;
  if (!key) return null;
  return transformsByName.get(key) ?? null;
}

function isNestedNode(v: unknown): v is TreeNodeData {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    "type" in v &&
    typeof (v as { type: unknown }).type === "string"
  );
}
