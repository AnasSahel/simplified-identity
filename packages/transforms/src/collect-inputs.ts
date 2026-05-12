import { getSpec } from "./registry";
import { isRecord } from "./_shared";
import type {
  EvaluableTransform,
  RequiredSimulationInput,
} from "./types";

/**
 * Walk a transform tree and accumulate every context-dependent input it
 * references. The drawer's Test tab uses this to render a "Simulated
 * context" form so users can plug in values for `accountAttribute`,
 * `identityAttribute`, `displayName` (firstname/lastname), etc.
 *
 * Composition is straightforward: every spec that has `directInputs`
 * declares its own contribution; the walker just descends recursively
 * into nested transform definitions and into `reference` chains.
 */
export function collectRequiredInputs(
  transform: EvaluableTransform,
  transformsByName: ReadonlyMap<string, EvaluableTransform>,
): RequiredSimulationInput[] {
  const out: RequiredSimulationInput[] = [];
  const visited = new Set<string>();
  walk(
    { type: transform.type, attributes: transform.attributes ?? {} },
    transformsByName,
    visited,
    out,
  );
  return dedupById(out);
}

function walk(
  node: { type: string; attributes: Record<string, unknown> },
  transformsByName: ReadonlyMap<string, EvaluableTransform>,
  visited: Set<string>,
  out: RequiredSimulationInput[],
): void {
  // Direct contributions of this node.
  const spec = getSpec(node.type);
  if (spec?.directInputs) {
    out.push(...spec.directInputs(node.attributes));
  }

  // Follow `reference` to its target — collect what the target needs too.
  if (node.type === "reference") {
    const refName = node.attributes.id;
    if (typeof refName === "string" && !visited.has(refName)) {
      visited.add(refName);
      const target = transformsByName.get(refName);
      if (target) {
        walk(
          {
            type: target.type,
            attributes: target.attributes ?? {},
          },
          transformsByName,
          visited,
          out,
        );
      }
    }
  }

  // Descend into nested transform-shaped values inside attributes.
  for (const value of Object.values(node.attributes)) {
    walkValue(value, transformsByName, visited, out);
  }
}

function walkValue(
  value: unknown,
  transformsByName: ReadonlyMap<string, EvaluableTransform>,
  visited: Set<string>,
  out: RequiredSimulationInput[],
): void {
  if (Array.isArray(value)) {
    for (const v of value) walkValue(v, transformsByName, visited, out);
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.type === "string") {
    walk(
      {
        type: value.type,
        attributes: isRecord(value.attributes) ? value.attributes : {},
      },
      transformsByName,
      visited,
      out,
    );
    return;
  }
  // Generic object — descend in case it nests a transform somewhere.
  for (const v of Object.values(value)) {
    walkValue(v, transformsByName, visited, out);
  }
}

function dedupById(
  inputs: RequiredSimulationInput[],
): RequiredSimulationInput[] {
  const seen = new Set<string>();
  const out: RequiredSimulationInput[] = [];
  for (const i of inputs) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    out.push(i);
  }
  return out;
}
