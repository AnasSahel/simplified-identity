/**
 * Pure helpers for the transform editor.
 *
 * Lives outside the `"use client"` component module because:
 *   - they are framework-agnostic functions (parse, derive, patch JSON)
 *   - they need to stay importable from any context (client or server)
 *   - they are unit-testable without a DOM
 *
 * The editor uses them as a bidirectional projection layer between the
 * CodeMirror JSON buffer (source of truth) and the dedicated `name` /
 * `type` form inputs surfaced above it.
 */

import { templateFor } from "@/lib/sailpoint/transforms/templates";

export type DerivedRoot = {
  type: string | null;
  name: string;
};

/**
 * Read `name` and `type` from a JSON string, returning empty/null fallbacks
 * when the JSON is invalid or doesn't match the expected shape.
 *
 * Never throws. The caller decides what to do when fields are missing —
 * for the editor, an empty name flips the Name input into the "required"
 * error state, and a null type flips the TypePicker into the "—" state.
 */
export function deriveRoot(jsonString: string): DerivedRoot {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
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

export type MutateKey = "type" | "name";

export type MutateOptions = {
  /**
   * On type change, force seeding `attributes` from the template even if
   * non-default attributes exist. Used when the user already confirmed
   * via the "this resets your attributes" dialog.
   */
  forceSeedAttributes?: boolean;
};

/**
 * Patch the `name` or `type` field of a JSON-encoded transform, returning
 * the re-stringified JSON (2-space indent).
 *
 * Behaviour:
 *   - Valid JSON in → parse, set the key, re-serialize.
 *   - For `type` : if `attributes` is missing/invalid, seed it from the
 *     template. If `forceSeedAttributes` is true, always re-seed even when
 *     attributes were already populated.
 *   - Invalid JSON in → rebuild a minimal valid skeleton from scratch
 *     (last-resort recovery so the input stays functional).
 *
 * The reformat-on-every-edit is intentional and documented in the ADR
 * 2026-05-11-transform-editor-name-type-inputs.
 */
export function mutateOrRebuild(
  prev: string,
  key: MutateKey,
  newValue: string,
  opts: MutateOptions = {},
): string {
  try {
    const parsed = JSON.parse(prev) as Record<string, unknown>;
    if (key === "type") {
      parsed.type = newValue;
      const attrsMissing =
        typeof parsed.attributes !== "object" ||
        parsed.attributes === null ||
        Array.isArray(parsed.attributes);
      if (attrsMissing || opts.forceSeedAttributes) {
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

/**
 * Decide whether the current `attributes` look like the default template
 * for `type` (i.e. the user hasn't customized them yet).
 *
 * Used to short-circuit the "switching type will reset attributes" prompt
 * when there's nothing to lose. A naive deep-equality is sufficient here —
 * templates are flat or shallow and we control their shape.
 *
 * Edge cases:
 *   - `attributes` not an object → treat as "default" (we'll seed fresh anyway)
 *   - Empty `{}` AND template empty `{}` → default
 *   - Same keys, same values (JSON-compared) → default
 */
export function attributesMatchTemplate(
  type: string,
  attributes: unknown,
): boolean {
  if (
    typeof attributes !== "object" ||
    attributes === null ||
    Array.isArray(attributes)
  ) {
    return true;
  }
  const tpl = templateFor(type).attributes;
  return stableStringify(attributes) === stableStringify(tpl);
}

/**
 * Deterministic JSON serialization (object keys sorted) for equality
 * comparison. Doesn't aim to be a general-purpose canonicalizer — just
 * enough to compare two attribute records reliably.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/**
 * Read `attributes` from a JSON string. Used by callers that need to check
 * whether attributes are template-default before re-seeding on type change.
 */
export function deriveAttributes(jsonString: string): unknown {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return (parsed as Record<string, unknown>).attributes ?? null;
  } catch {
    return null;
  }
}
