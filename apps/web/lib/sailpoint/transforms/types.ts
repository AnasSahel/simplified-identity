import type { TransformGroupSlug } from "@/lib/sailpoint/transform-groups";

/**
 * One spec per SailPoint transform type. Stored in a registry keyed by
 * `type` and dispatched from a single evaluator. Each spec is responsible
 * for two things:
 *
 *   1. **Declaring its context dependencies** (`directInputs`) — the
 *      attributes that don't come from the user's input value but from
 *      the SailPoint runtime context (an account, an identity, etc.).
 *      The drawer's Test tab walks the transform tree and aggregates all
 *      such inputs into a "Simulated context" form so the user can
 *      provide values manually.
 *
 *   2. **Evaluating** — pure function from `(attrs, input, ctx)` to a
 *      string. May throw `TransformEvalError` (runtime issue, e.g. bad
 *      regex) or `UnsupportedTransformTypeError` (genuinely cannot run
 *      locally — e.g. SailPoint cloud rule).
 */

export type EvaluableTransform = {
  id: string;
  name: string;
  type: string;
  attributes?: Record<string, unknown>;
};

export type RequiredSimulationInput = {
  /**
   * Stable id used both as the form field name and as the lookup key in
   * `EvalContext.simulatedValues`. Typical shapes:
   *   - `identity.<attrName>`
   *   - `account.<sourceName>.<attrName>`
   */
  id: string;
  /** Human-friendly label shown next to the input. */
  label: string;
  /** Optional sub-label, e.g. `"from source: Active Directory"`. */
  hint?: string;
};

/**
 * One step of a transform evaluation — captured by the central evaluator
 * whenever `EvalContext.traces` is provided. The Test tab uses these to
 * render a "Steps" panel under the Output, so the user can see the
 * intermediate value of each sub-transform in a chain (firstValid →
 * reference → normalizeNames, etc.).
 *
 * Trace = passive observation: the evaluator never mutates results based
 * on this. Pushed post-order (the parent appears AFTER its children in
 * the array); the UI uses `depth` to render hierarchy visually.
 *
 * Decision and shape: see ADR `2026-05-11-transform-test-step-trace.md`.
 */
export type Trace = {
  /** SailPoint transform type (e.g. "concat", "static"). */
  type: string;
  /** Raw attrs of the node — kept for debug expansion in a future UI. */
  attrs: Record<string, unknown>;
  /** Value piped into this node (already resolved by the parent). */
  input: string;
  /** Result of `spec.evaluate`. Empty string when the eval threw. */
  output: string;
  /** Depth in the eval tree — drives indentation in the UI. */
  depth: number;
  /**
   * Present only when the spec threw. Serialised to string so the trace
   * survives e.g. `JSON.stringify` for copy-debug flows.
   */
  error?: string;
  /**
   * Non-blocking signal from the spec when it produced a result but the
   * shape of that result is likely surprising (e.g. `split` returning the
   * whole input because the delimiter didn't match). The output is still
   * the spec's regular return value — the warning is purely advisory and
   * meant for the Test tab to render an amber callout.
   *
   * Specs emit warnings by setting `EvalContext._specWarning` on the
   * context before returning; `evalNode` reads + clears that slot when
   * pushing the trace entry. See `_shared.ts`.
   */
  warning?: string;
};

export type EvalContext = {
  transformsByName: ReadonlyMap<string, EvaluableTransform>;
  /** Keyed by `RequiredSimulationInput.id`. Empty by default. */
  simulatedValues: Readonly<Record<string, string>>;
  /**
   * Optional trace buffer. When provided, the evaluator pushes one entry
   * per `evalNode` call (success or throw). Leave undefined to skip
   * instrumentation entirely — zero cost when not opted in.
   */
  traces?: Trace[];
  /**
   * Transient slot for a spec to emit a non-blocking warning about its
   * own evaluation (e.g. delimiter didn't match, index out of bounds).
   * Read and cleared by `evalNode` immediately after `spec.evaluate`
   * returns, then folded into the trace entry as `warning`.
   *
   * Underscore prefix marks this as an evaluator-internal channel — specs
   * write to it, but no consumer outside `evalNode` should read it.
   * Always reset to `undefined` before calling `spec.evaluate` (defensive
   * against leaks across nested specs).
   */
  _specWarning?: string;
};

export type TransformSpec = {
  type: string;
  group: TransformGroupSlug;
  /** Plain-English description shown in the drawer. */
  description: string;
  /**
   * Context inputs that THIS node consumes (not its nested children — the
   * walker handles those by descending). Return `[]` when the spec is
   * pure / context-free.
   */
  directInputs?: (
    attrs: Record<string, unknown>,
  ) => RequiredSimulationInput[];
  /** Pure evaluator. */
  evaluate: (
    attrs: Record<string, unknown>,
    input: string,
    ctx: EvalContext,
    depth: number,
  ) => string;
};

export class UnsupportedTransformTypeError extends Error {
  readonly type: string;
  constructor(type: string, message: string) {
    super(message);
    this.name = "UnsupportedTransformTypeError";
    this.type = type;
  }
}

export class TransformEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransformEvalError";
  }
}
