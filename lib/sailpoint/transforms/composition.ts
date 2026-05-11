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

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/conditional
 *
 * Branches between `positiveCondition` and `negativeCondition` based on an
 * equality `expression`. The expression is a string of the form
 * `$operandA eq $operandB` (or with literals on either side). Operands
 * prefixed with `$` resolve against the OTHER keys of `attrs` — each
 * placeholder slot can hold either a primitive (string/number/bool) or a
 * full sub-transform that we evaluate before comparing.
 *
 * Local-evaluator scope (v0):
 *  - Only `eq` is implemented. SailPoint's runtime supports a wider set
 *    (`ne`, etc.); we throw with a clear message for anything else so the
 *    user knows they hit an evaluator limit, not a tenant bug.
 *  - Comparison is string-equality (SailPoint coerces to string too).
 *
 * Placeholder resolution:
 *   attrs = { expression: "$x eq EXTERNAL", x: { type: "accountAttribute", … }, positiveCondition: "Yes", negativeCondition: "No" }
 *   -> read attrs.x, eval it through evalValue, compare to "EXTERNAL".
 *
 * The catalogue declares only the 3 fixed keys (expression / positiveCondition
 * / negativeCondition) — additional placeholders are arbitrary keys and
 * users add them via the Raw JSON view.
 */
export const conditional: TransformSpec = {
  type: "conditional",
  group: "conditional",
  description:
    "Branches between positiveCondition and negativeCondition based on an equality expression. Only `eq` is supported by the local evaluator.",
  evaluate: (attrs, input, ctx, depth) => {
    const expression = attrs.expression;
    if (typeof expression !== "string" || !expression.trim()) {
      throw new TransformEvalError(
        "conditional: missing or invalid `expression` attribute",
      );
    }
    if (attrs.positiveCondition === undefined) {
      throw new TransformEvalError(
        "conditional: missing `positiveCondition` attribute",
      );
    }
    if (attrs.negativeCondition === undefined) {
      throw new TransformEvalError(
        "conditional: missing `negativeCondition` attribute",
      );
    }

    // Tokenize on whitespace. SailPoint accepts exactly three tokens:
    // <operandA> <operator> <operandB>.
    const tokens = expression.trim().split(/\s+/);
    if (tokens.length !== 3) {
      throw new TransformEvalError(
        `conditional: malformed expression "${expression}". Expected three tokens: "<a> <op> <b>".`,
      );
    }
    const [rawA, op, rawB] = tokens;

    if (op !== "eq") {
      throw new TransformEvalError(
        `conditional: operator "${op}" not supported in the local evaluator (only "eq" is supported in v0).`,
      );
    }

    const resolveOperand = (raw: string): string => {
      // `$name` placeholder — look up the matching key on `attrs`.
      if (raw.startsWith("$")) {
        const name = raw.slice(1);
        if (!(name in attrs)) {
          throw new TransformEvalError(
            `conditional: placeholder "$${name}" not found in attributes`,
          );
        }
        return evalValue(attrs[name], input, ctx, depth);
      }
      // Bare literal — strip optional surrounding quotes for ergonomics.
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        return raw.slice(1, -1);
      }
      return raw;
    };

    const a = resolveOperand(rawA);
    const b = resolveOperand(rawB);
    const matched = a === b;

    return evalValue(
      matched ? attrs.positiveCondition : attrs.negativeCondition,
      input,
      ctx,
      depth,
    );
  },
};

export const COMPOSITION_SPECS = [firstValid, reference, lookup, conditional];
