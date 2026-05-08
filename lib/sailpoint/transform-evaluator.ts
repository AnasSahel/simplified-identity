/**
 * Public API for the transform evaluator.
 *
 * This file is a thin dispatcher — per-type behaviour lives in
 * `transforms/<category>.ts`, registered in `transforms/registry.ts`. To
 * add or fix a transform, edit the spec in its category file; nothing
 * here changes.
 *
 * Refactored from a monolithic switch (ADR 010) so the Test tab UI can
 * introspect each transform's context dependencies and ask the user to
 * simulate them, rather than bailing with "Not testable locally".
 */

import { evalNode } from "./transforms/_shared";
import { collectRequiredInputs } from "./transforms/collect-inputs";
import { getSpec, knownTypes } from "./transforms/registry";
import {
  TransformEvalError,
  UnsupportedTransformTypeError,
  type EvalContext,
  type EvaluableTransform,
  type RequiredSimulationInput,
  type TransformSpec,
} from "./transforms/types";

export {
  TransformEvalError,
  UnsupportedTransformTypeError,
  collectRequiredInputs,
  getSpec,
  knownTypes,
};
export type {
  EvalContext,
  EvaluableTransform,
  RequiredSimulationInput,
  TransformSpec,
};

export type EvalResult =
  | { ok: true; output: string }
  | { ok: false; error: string; unsupported?: boolean; type?: string };

export function evaluateTransform(
  transform: EvaluableTransform,
  input: string,
  ctx: EvalContext,
): EvalResult {
  try {
    const output = evalNode(
      transform.type,
      transform.attributes ?? {},
      input,
      ctx,
      0,
    );
    return { ok: true, output };
  } catch (e) {
    if (e instanceof UnsupportedTransformTypeError) {
      return {
        ok: false,
        error: e.message,
        unsupported: true,
        type: e.type,
      };
    }
    if (e instanceof TransformEvalError) {
      return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
