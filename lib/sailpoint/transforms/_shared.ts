import { getSpec } from "./registry";
import {
  TransformEvalError,
  UnsupportedTransformTypeError,
  type EvalContext,
} from "./types";

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Polymorphic dispatcher used inside specs to evaluate a value that may be
 * either a literal string/number or a nested transform definition. Keeping
 * it here (rather than inlined per spec) means each spec only deals with
 * its own type's logic.
 */
export function evalValue(
  value: unknown,
  input: string,
  ctx: EvalContext,
  depth: number,
): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => evalValue(v, input, ctx, depth)).join("");
  }
  if (isRecord(value) && typeof value.type === "string") {
    return evalNode(
      value.type,
      isRecord(value.attributes) ? value.attributes : {},
      input,
      ctx,
      depth + 1,
    );
  }
  return "";
}

const MAX_DEPTH = 50;

export function evalNode(
  type: string,
  attrs: Record<string, unknown>,
  input: string,
  ctx: EvalContext,
  depth: number,
): string {
  if (depth > MAX_DEPTH) {
    throw new TransformEvalError(
      `Recursion depth exceeded (${MAX_DEPTH}). Likely a circular reference.`,
    );
  }
  const spec = getSpec(type);
  if (!spec) {
    throw new UnsupportedTransformTypeError(
      type,
      `Unknown transform type "${type}".`,
    );
  }
  return spec.evaluate(attrs, input, ctx, depth);
}
