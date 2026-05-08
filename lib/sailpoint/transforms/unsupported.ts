import { UnsupportedTransformTypeError, type TransformSpec } from "./types";

/**
 * Types that we explicitly mark as not testable locally. Each carries a
 * specific reason so the UI message is actionable.
 */
const UNSUPPORTED_REASONS: Record<string, string> = {
  rule: "Rule transforms execute Beanshell / Java on the SailPoint engine. Not portable to a local evaluator.",
  conditional:
    "conditional is implementable on the same pattern but isn't wired in v1. Open an issue if you need it.",
  dateCompare:
    "dateCompare needs date math we haven't ported yet. Open an issue if you need it.",
  dateMath:
    "dateMath needs date math we haven't ported yet. Open an issue if you need it.",
};

function makeSpec(type: string, reason: string): TransformSpec {
  return {
    type,
    group: "other" as const,
    description: reason,
    evaluate: () => {
      throw new UnsupportedTransformTypeError(type, reason);
    },
  };
}

export const UNSUPPORTED_SPECS: TransformSpec[] = Object.entries(
  UNSUPPORTED_REASONS,
).map(([type, reason]) => makeSpec(type, reason));
