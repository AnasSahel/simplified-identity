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

export type EvalContext = {
  transformsByName: ReadonlyMap<string, EvaluableTransform>;
  /** Keyed by `RequiredSimulationInput.id`. Empty by default. */
  simulatedValues: Readonly<Record<string, string>>;
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
