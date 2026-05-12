import { COMPOSITION_SPECS } from "./composition";
import { CONTEXT_SPECS } from "./context";
import { DATE_OPS_SPECS } from "./date-ops";
import { ENCODING_SPECS } from "./encoding";
import { FORMAT_SPECS } from "./format";
import { NORMALIZATION_SPECS } from "./normalization";
import { RANDOM_SPECS } from "./random";
import { STRING_OPS_SPECS } from "./string-ops";
import { UNSUPPORTED_SPECS } from "./unsupported";
import type { TransformSpec } from "./types";

const ALL_SPECS: TransformSpec[] = [
  ...STRING_OPS_SPECS,
  ...NORMALIZATION_SPECS,
  ...FORMAT_SPECS,
  ...COMPOSITION_SPECS,
  ...DATE_OPS_SPECS,
  ...ENCODING_SPECS,
  ...CONTEXT_SPECS,
  ...RANDOM_SPECS,
  ...UNSUPPORTED_SPECS,
];

export const TRANSFORM_REGISTRY: Readonly<Record<string, TransformSpec>> =
  Object.freeze(
    ALL_SPECS.reduce<Record<string, TransformSpec>>((acc, spec) => {
      if (acc[spec.type]) {
        // Defensive — should never happen but better caught at startup.
        throw new Error(
          `Duplicate transform spec for type "${spec.type}".`,
        );
      }
      acc[spec.type] = spec;
      return acc;
    }, {}),
  );

export function getSpec(type: string): TransformSpec | undefined {
  return TRANSFORM_REGISTRY[type];
}

export function knownTypes(): string[] {
  return Object.keys(TRANSFORM_REGISTRY).sort();
}
