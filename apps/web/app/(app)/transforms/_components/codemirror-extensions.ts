import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { hoverTooltip, type Tooltip } from "@codemirror/view";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

import { TRANSFORM_REGISTRY } from "@/lib/sailpoint/transforms/registry";
import { TRANSFORM_GROUPS } from "@/lib/sailpoint/transform-groups";

/**
 * CodeMirror extensions for the transform JSON editor.
 *
 * 1. autocomplete on `"id"` inside a `reference` block → tenant transform names
 * 2. autocomplete on `"sourceName"` inside an `accountAttribute` block → tenant source names
 * 3. hover tooltip on `"type": "<name>"` → spec description + doc link
 *
 * All three rely on walking the lezer JSON syntax tree to detect context.
 */

type SimpleTransform = { id: string; name: string; type: string };
type SimpleSource = { id: string; name: string };

// ── Helpers ────────────────────────────────────────────────────────────

function readString(state: EditorState, node: SyntaxNode): string {
  // Slice includes surrounding quotes — strip them.
  const raw = state.doc.sliceString(node.from, node.to);
  return raw.replace(/^"|"$/g, "");
}

/** Find the Property whose name matches `key` inside an Object. */
function findPropertyByKey(
  state: EditorState,
  objectNode: SyntaxNode,
  key: string,
): SyntaxNode | null {
  let child = objectNode.firstChild;
  while (child) {
    if (child.name === "Property") {
      const nameNode = child.firstChild;
      if (nameNode && nameNode.name === "PropertyName") {
        const propKey = readString(state, nameNode);
        if (propKey === key) return child;
      }
    }
    child = child.nextSibling;
  }
  return null;
}

/** Read the value Node of a Property (the one after `:`). */
function valueNodeOfProperty(prop: SyntaxNode): SyntaxNode | null {
  let child = prop.firstChild;
  // Skip PropertyName, then expect the value after the ":"
  while (child) {
    if (child.name !== "PropertyName" && child.name !== "⚠") {
      return child;
    }
    child = child.nextSibling;
  }
  return null;
}

/**
 * Given a node that's the value of a string property (e.g. `"id"`), walk up
 * to find the parent Object that contains the surrounding `attributes`,
 * then check if its `type` matches one of the supplied values.
 */
function isInsideTypeContext(
  state: EditorState,
  stringNode: SyntaxNode,
  expectedKey: string,
  expectedTypes: string[],
): boolean {
  // stringNode → Property → Object (attributes) → Property (attributes) → Object (transform)
  const property = stringNode.parent;
  if (!property || property.name !== "Property") return false;
  const propName = property.firstChild;
  if (!propName || propName.name !== "PropertyName") return false;
  if (readString(state, propName) !== expectedKey) return false;

  const attrsObject = property.parent;
  if (!attrsObject || attrsObject.name !== "Object") return false;

  const attrsProperty = attrsObject.parent;
  if (!attrsProperty || attrsProperty.name !== "Property") return false;
  const attrsName = attrsProperty.firstChild;
  if (
    !attrsName ||
    attrsName.name !== "PropertyName" ||
    readString(state, attrsName) !== "attributes"
  ) {
    return false;
  }

  const transformObject = attrsProperty.parent;
  if (!transformObject || transformObject.name !== "Object") return false;

  const typeProp = findPropertyByKey(state, transformObject, "type");
  if (!typeProp) return false;
  const typeValueNode = valueNodeOfProperty(typeProp);
  if (!typeValueNode || typeValueNode.name !== "String") return false;
  const typeValue = readString(state, typeValueNode);
  return expectedTypes.includes(typeValue);
}

/** Infer the value range we should replace on accept (excluding quotes). */
function stringInnerRange(node: SyntaxNode) {
  return { from: node.from + 1, to: node.to - 1 };
}

// ── Autocomplete ───────────────────────────────────────────────────────

function makeAutocomplete(
  transforms: SimpleTransform[],
  sources: SimpleSource[],
) {
  return (context: CompletionContext): CompletionResult | null => {
    const tree = syntaxTree(context.state);
    const node = tree.resolveInner(context.pos, -1);
    if (node.name !== "String") return null;

    const range = stringInnerRange(node);
    if (context.pos < range.from || context.pos > range.to) return null;

    if (
      isInsideTypeContext(context.state, node, "id", ["reference"]) &&
      transforms.length > 0
    ) {
      const options: Completion[] = transforms.map((t) => ({
        label: t.name,
        type: "variable",
        detail: t.type,
        boost: 0,
      }));
      return { from: range.from, to: range.to, options, validFor: /^.*$/ };
    }

    if (
      isInsideTypeContext(context.state, node, "sourceName", [
        "accountAttribute",
      ]) &&
      sources.length > 0
    ) {
      const options: Completion[] = sources.map((s) => ({
        label: s.name,
        type: "variable",
        boost: 0,
      }));
      return { from: range.from, to: range.to, options, validFor: /^.*$/ };
    }

    return null;
  };
}

export function transformAutocomplete(
  transforms: SimpleTransform[],
  sources: SimpleSource[],
) {
  return autocompletion({
    override: [makeAutocomplete(transforms, sources)],
  });
}

// ── Hover tooltip on "type": "..." ─────────────────────────────────────

export function transformTypeHover() {
  return hoverTooltip((view, pos): Tooltip | null => {
    const node = syntaxTree(view.state).resolveInner(pos, -1);
    if (node.name !== "String") return null;

    const property = node.parent;
    if (!property || property.name !== "Property") return null;
    const nameNode = property.firstChild;
    if (
      !nameNode ||
      nameNode.name !== "PropertyName" ||
      readString(view.state, nameNode) !== "type"
    ) {
      return null;
    }

    const typeValue = readString(view.state, node);
    const spec = TRANSFORM_REGISTRY[typeValue];
    if (!spec) return null;

    const docSlug = typeToDocSlug(typeValue);
    const groupLabel = TRANSFORM_GROUPS[spec.group]?.label ?? spec.group;

    return {
      pos: node.from,
      end: node.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className =
          "rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md max-w-sm";
        const title = document.createElement("p");
        title.className = "font-mono font-medium";
        title.textContent = typeValue;
        dom.appendChild(title);
        const meta = document.createElement("p");
        meta.className = "mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground";
        meta.textContent = groupLabel;
        dom.appendChild(meta);
        const desc = document.createElement("p");
        desc.className = "mt-1 leading-relaxed";
        desc.textContent = spec.description;
        dom.appendChild(desc);
        const link = document.createElement("a");
        link.className = "mt-1 inline-block text-blue-600 hover:underline";
        link.href = `https://developer.sailpoint.com/docs/extensibility/transforms/operations/${docSlug}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open SailPoint docs ↗";
        dom.appendChild(link);
        return { dom };
      },
    };
  });
}

/** Map our camelCase types to the kebab-case slugs used in the SailPoint docs URL. */
function typeToDocSlug(type: string): string {
  // Manual overrides for irregular cases
  const overrides: Record<string, string> = {
    e164phone: "e164-phone",
    iso3166: "iso-3166",
    rfc5646: "rfc-5646",
    normalizeNames: "name-normalizer",
    decomposeDiacriticalMarks: "decompose-diacritical-marks",
    accountAttribute: "account-attribute",
    identityAttribute: "identity-attribute",
    base64Encode: "base64-encode",
    base64Decode: "base64-decode",
    dateFormat: "date-format",
    dateMath: "date-math",
    dateCompare: "date-compare",
    firstValid: "first-valid",
    displayName: "display-name",
    replaceAll: "replace-all",
  };
  return (
    overrides[type] ??
    type.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")
  );
}
