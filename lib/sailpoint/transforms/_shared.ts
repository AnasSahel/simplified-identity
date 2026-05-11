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
 * Resolves the effective input for a unary-input spec.
 *
 * SailPoint transforms support an optional `attributes.input` sub-transform
 * that overrides the input flowing in from the parent chain. When present,
 * we evaluate it (recursively, with trace) and use its result; otherwise we
 * fall back to the contextual `input` the parent passed in.
 *
 * Specs whose evaluator used to be `(_attrs, input) => …` should switch to
 * `(attrs, input, ctx, depth) => …` and resolve via this helper so the
 * nested `attrs.input` is honoured.
 */
export function resolveInput(
  attrs: Record<string, unknown>,
  contextInput: string,
  ctx: EvalContext,
  depth: number,
): string {
  const nested = attrs.input;
  if (nested === undefined || nested === null) return contextInput;
  return evalValue(nested, contextInput, ctx, depth);
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
  // Fast path: no tracing requested → zero overhead beyond dispatch.
  if (!ctx.traces) return spec.evaluate(attrs, input, ctx, depth);

  // Traced path: capture success AND failure (post-order push) so the UI
  // can highlight the failing step. Re-throw so callers (incl. firstValid
  // fallback logic) keep their existing semantics.
  try {
    const output = spec.evaluate(attrs, input, ctx, depth);
    ctx.traces.push({ type, attrs, input, output, depth });
    return output;
  } catch (e) {
    ctx.traces.push({
      type,
      attrs,
      input,
      output: "",
      depth,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
