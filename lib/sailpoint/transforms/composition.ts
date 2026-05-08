import {
  TransformEvalError,
  UnsupportedTransformTypeError,
  type TransformSpec,
} from "./types";
import { evalNode, evalValue, isRecord } from "./_shared";

export const firstValid: TransformSpec = {
  type: "firstValid",
  group: "lookup",
  description:
    "Walks a list of fallbacks and returns the first one that produces a non-empty value.",
  evaluate: (attrs, input, ctx, depth) => {
    const values = attrs.values;
    if (!Array.isArray(values)) return "";
    let unsupportedSeen: UnsupportedTransformTypeError | null = null;
    for (const v of values) {
      try {
        const result = evalValue(v, input, ctx, depth);
        if (result !== "" && result != null) return result;
      } catch (e) {
        if (e instanceof UnsupportedTransformTypeError) {
          unsupportedSeen = e;
          continue;
        }
        continue;
      }
    }
    if (unsupportedSeen !== null) {
      throw new UnsupportedTransformTypeError(
        unsupportedSeen.type,
        `firstValid couldn't be evaluated: every fallback either failed or relies on a type that needs SailPoint context (${unsupportedSeen.type}).`,
      );
    }
    return "";
  },
};

export const reference: TransformSpec = {
  type: "reference",
  group: "lookup",
  description:
    "Delegates to another named transform. Optionally reshapes the input via a sub-transform first.",
  evaluate: (attrs, input, ctx, depth) => {
    const refName = String(attrs.id ?? "");
    if (!refName) {
      throw new TransformEvalError("reference: missing transform name");
    }
    const referenced = ctx.transformsByName.get(refName);
    if (!referenced) {
      throw new TransformEvalError(
        `Referenced transform "${refName}" not found in this tenant.`,
      );
    }
    const refInput =
      attrs.input !== undefined
        ? evalValue(attrs.input, input, ctx, depth)
        : input;
    return evalNode(
      referenced.type,
      referenced.attributes ?? {},
      refInput,
      ctx,
      depth + 1,
    );
  },
};

export const lookup: TransformSpec = {
  type: "lookup",
  group: "lookup",
  description:
    "Looks up the input in a static table; falls back to `default` or empty string.",
  evaluate: (attrs, input) => {
    const table = attrs.table;
    if (!isRecord(table)) {
      throw new TransformEvalError(
        "lookup: missing or invalid `table` attribute",
      );
    }
    const hit = table[input];
    if (hit !== undefined) return String(hit);
    const fallback = table.default;
    if (fallback !== undefined) return String(fallback);
    return "";
  },
};

export const COMPOSITION_SPECS = [firstValid, reference, lookup];
