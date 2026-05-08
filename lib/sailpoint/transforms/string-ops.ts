import {
  TransformEvalError,
  UnsupportedTransformTypeError,
  type TransformSpec,
} from "./types";
import { evalValue, isRecord } from "./_shared";

export const upper: TransformSpec = {
  type: "upper",
  group: "string-ops",
  description: "Uppercases the input string.",
  evaluate: (_attrs, input) => input.toUpperCase(),
};

export const lower: TransformSpec = {
  type: "lower",
  group: "string-ops",
  description: "Lowercases the input string.",
  evaluate: (_attrs, input) => input.toLowerCase(),
};

export const trim: TransformSpec = {
  type: "trim",
  group: "string-ops",
  description: "Removes leading and trailing whitespace.",
  evaluate: (_attrs, input) => input.trim(),
};

export const concat: TransformSpec = {
  type: "concat",
  group: "string-ops",
  description: "Concatenates several values into one string.",
  evaluate: (attrs, input, ctx, depth) => {
    const values = attrs.values;
    if (!Array.isArray(values)) return "";
    return values.map((v) => evalValue(v, input, ctx, depth)).join("");
  },
};

export const split: TransformSpec = {
  type: "split",
  group: "string-ops",
  description:
    "Splits the input by a delimiter and returns one of the resulting parts by index.",
  evaluate: (attrs, input) => {
    const delimiter = String(attrs.delimiter ?? " ");
    const index = Number(attrs.index ?? 0);
    const parts = input.split(delimiter);
    if (index < 0) return parts[parts.length + index] ?? "";
    return parts[index] ?? "";
  },
};

export const substring: TransformSpec = {
  type: "substring",
  group: "string-ops",
  description: "Extracts a fixed slice of the input string.",
  evaluate: (attrs, input) => {
    const begin = Number(attrs.begin ?? 0);
    const end = attrs.end !== undefined ? Number(attrs.end) : undefined;
    return end !== undefined ? input.slice(begin, end) : input.slice(begin);
  },
};

export const replace: TransformSpec = {
  type: "replace",
  group: "string-ops",
  description: "Replaces the first regex match in the input.",
  evaluate: (attrs, input) => {
    const regex = String(attrs.regex ?? "");
    const replacement = String(attrs.replacement ?? "");
    try {
      return input.replace(new RegExp(regex), replacement);
    } catch (e) {
      throw new TransformEvalError(
        `Invalid regex "${regex}": ${(e as Error).message}`,
      );
    }
  },
};

export const replaceAll: TransformSpec = {
  type: "replaceAll",
  group: "string-ops",
  description:
    "Applies a table of regex → replacement substitutions to the input.",
  evaluate: (attrs, input) => {
    const table = attrs.table;
    if (!isRecord(table)) return input;
    let result = input;
    for (const [pattern, replacement] of Object.entries(table)) {
      try {
        result = result.replace(
          new RegExp(pattern, "g"),
          String(replacement ?? ""),
        );
      } catch (e) {
        throw new TransformEvalError(
          `Invalid regex "${pattern}": ${(e as Error).message}`,
        );
      }
    }
    return result;
  },
};

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/static
 *
 * Despite the name, `static` is a templating engine — `value` is an Apache
 * Velocity (VTL) expression. SailPoint registers the other attributes as
 * named variables; the value can reference them with `$varName`, run
 * `#if/#else`, access identity properties via `$identity.firstname`, etc.
 *
 * Local coverage:
 *   - plain text → return as-is (most common static use)
 *   - `$varName` / `${varName}` → resolves against `attributes.<varName>`
 *     (typically a sub-transform like `accountAttribute`). Recursive.
 *   - directives (`#if`, `#foreach`, `#set`, …) → Unsupported
 *   - property access (`$identity.firstname`, `$account.email`) →
 *     Unsupported with a hint to refactor as a named variable attribute
 */
const VELOCITY_DIRECTIVE_RE =
  /#(if|elseif|else|end|foreach|set|macro|parse|include)\b/i;
const VELOCITY_PROPERTY_RE = /\$\{?[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_]/;
const VELOCITY_VARIABLE_RE = /\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g;

export const staticValue: TransformSpec = {
  type: "static",
  group: "static",
  description:
    "Returns a Velocity-templated value. Plain text and simple $varName substitution are evaluated locally; directives (#if, #foreach…) and $object.property access need SailPoint runtime.",
  evaluate: (attrs, input, ctx, depth) => {
    const value = String(attrs.value ?? "");
    if (!value.includes("$") && !value.includes("#")) return value;

    if (VELOCITY_DIRECTIVE_RE.test(value)) {
      throw new UnsupportedTransformTypeError(
        "static",
        "Velocity directives (#if, #foreach, #set…) aren't implemented locally. SailPoint runtime evaluates the full VTL — refactor or use a real-identity test.",
      );
    }
    if (VELOCITY_PROPERTY_RE.test(value)) {
      throw new UnsupportedTransformTypeError(
        "static",
        "Velocity property access (e.g. $identity.firstname) isn't implemented locally. Refactor by registering the value as a named attribute (e.g. firstname → accountAttribute), then reference it as $firstname.",
      );
    }

    return value.replace(VELOCITY_VARIABLE_RE, (match, name: string) => {
      if (name === "value") return match;
      const subAttr = attrs[name];
      if (subAttr === undefined) {
        throw new TransformEvalError(
          `static: Velocity variable $${name} has no matching attribute. Add an attribute named "${name}" carrying the source (typically a sub-transform).`,
        );
      }
      return evalValue(subAttr, input, ctx, depth);
    });
  },
};

export const STRING_OPS_SPECS = [
  upper,
  lower,
  trim,
  concat,
  split,
  substring,
  replace,
  replaceAll,
  staticValue,
];
