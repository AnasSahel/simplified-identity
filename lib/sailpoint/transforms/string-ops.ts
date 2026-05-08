import { TransformEvalError, type TransformSpec } from "./types";
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

export const staticValue: TransformSpec = {
  type: "static",
  group: "static",
  description: "Returns a fixed value, ignoring the input.",
  evaluate: (attrs) => String(attrs.value ?? ""),
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
