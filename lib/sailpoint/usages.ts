/**
 * Compute how many times each transform is referenced across the tenant.
 *
 * SailPoint references a transform by **name** (not id), via the pattern:
 *   { type: "reference", attributes: { id: "<transform-name>" } }
 *
 * This pattern can appear (a) inside identity profile attribute configs
 * and (b) nested inside other transforms. We walk both sources in memory.
 *
 * Pure function — no I/O. Caller is responsible for fetching the inputs.
 */

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectReferences(
  node: unknown,
  counts: Map<string, number>,
): void {
  if (!isRecord(node)) {
    if (Array.isArray(node)) {
      for (const item of node) collectReferences(item, counts);
    }
    return;
  }

  if (
    node.type === "reference" &&
    isRecord(node.attributes) &&
    typeof node.attributes.id === "string"
  ) {
    const id = node.attributes.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) collectReferences(item, counts);
    } else if (isRecord(value)) {
      collectReferences(value, counts);
    }
  }
}

export type TransformLike = {
  id: string;
  name: string;
  attributes?: Record<string, unknown>;
};

export function computeTransformUsages(
  transforms: ReadonlyArray<TransformLike>,
  identityProfiles: ReadonlyArray<unknown>,
): Map<string, number> {
  const counts = new Map<string, number>();

  // (a) Identity profiles — walk the entire payload
  for (const profile of identityProfiles) {
    collectReferences(profile, counts);
  }

  // (b) Other transforms' attributes (catches transform→transform chains)
  for (const t of transforms) {
    if (t.attributes) collectReferences(t.attributes, counts);
  }

  return counts;
}
