/**
 * Group transforms by detected name prefix for the Transforms List page.
 *
 * Decisions are locked by the ADR
 * `vault/Projects/Simplified Identity/2026-05-14-transforms-list-grouping-by-prefix.md`:
 *
 *   - **Q1 — Group key:** the substring before the first `-` in `name`.
 *     If there is no `-`, the transform falls into the special `Other`
 *     bucket. Zero config; matches the dominant naming convention
 *     (`<scope>-<...>`) without asking the admin to declare anything.
 *
 *   - **Q2 — Cap & overflow:** at most `maxGroups` groups are kept
 *     (default `12`). Beyond that, the smallest groups are merged into
 *     `Other` until we are within the cap. No transform is ever hidden.
 *
 *   - **Solo absorption:** any non-`Other` group with fewer than
 *     `minGroupSize` (default `2`) entries is folded into `Other`. The
 *     visual benefit of a header disappears at N=1, the noise stays.
 *
 * Pure: no React, no fetch, no DB. Only arrays and maps. Lives in the
 * `transforms` package so it can be unit-tested without any web dep.
 */

export type GroupableTransform = {
  /** Stable, used as React key by the table. */
  id: string;
  /** Source of the prefix (split on first `-`). */
  name: string;
};

export type PrefixGroup<T extends GroupableTransform> = {
  /** Detected prefix, or the literal `"Other"` for the overflow bucket. */
  prefix: string;
  /** Convenience — equal to `transforms.length`. */
  count: number;
  transforms: T[];
};

export type GroupTransformsByPrefixOptions = {
  /** Default 12. Headers above this count get merged into `Other`. */
  maxGroups?: number;
  /** Default 2. Groups smaller than this collapse into `Other`. */
  minGroupSize?: number;
};

/** Sentinel prefix for the overflow / fallback bucket. */
export const OTHER_GROUP_PREFIX = "Other";

const DEFAULT_MAX_GROUPS = 12;
const DEFAULT_MIN_GROUP_SIZE = 2;

/**
 * Bucket transforms by the substring before their first `-`, then apply
 * the solo-absorption and overflow rules. The returned list is
 * alphabetically sorted, with `Other` (when present) always last.
 *
 * Determinism: the order of transforms inside each group is preserved
 * from the input. Callers that want a specific intra-group order should
 * sort upstream.
 */
export function groupTransformsByPrefix<T extends GroupableTransform>(
  transforms: ReadonlyArray<T>,
  opts: GroupTransformsByPrefixOptions = {},
): PrefixGroup<T>[] {
  const maxGroups = opts.maxGroups ?? DEFAULT_MAX_GROUPS;
  const minGroupSize = opts.minGroupSize ?? DEFAULT_MIN_GROUP_SIZE;

  if (transforms.length === 0) return [];

  // 1. Bucket by prefix. Names without a `-` go straight into Other.
  const buckets = new Map<string, T[]>();
  for (const t of transforms) {
    const idx = t.name.indexOf("-");
    const prefix = idx === -1 ? OTHER_GROUP_PREFIX : t.name.slice(0, idx);
    const existing = buckets.get(prefix);
    if (existing) {
      existing.push(t);
    } else {
      buckets.set(prefix, [t]);
    }
  }

  // 2. Solo absorption — anything below minGroupSize folds into Other.
  const other: T[] = buckets.get(OTHER_GROUP_PREFIX) ?? [];
  buckets.delete(OTHER_GROUP_PREFIX);
  for (const [prefix, ts] of Array.from(buckets.entries())) {
    if (ts.length < minGroupSize) {
      other.push(...ts);
      buckets.delete(prefix);
    }
  }

  // 3. Cap to maxGroups. Reserve one slot for Other (only if it ends up
  //    populated) so we keep `maxGroups - 1` real prefixes when overflow
  //    forces a bucket. If Other is empty AND we are not in overflow, we
  //    can keep up to `maxGroups` real prefixes.
  const realPrefixes = Array.from(buckets.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );
  const willHaveOther = other.length > 0 || realPrefixes.length > maxGroups;
  const keptCap = willHaveOther ? maxGroups - 1 : maxGroups;
  const kept = realPrefixes.slice(0, Math.max(keptCap, 0));
  const overflow = realPrefixes.slice(Math.max(keptCap, 0));
  for (const [, ts] of overflow) other.push(...ts);

  // 4. Render order: kept groups alphabetical, Other last.
  const out: PrefixGroup<T>[] = kept
    .map(([prefix, ts]) => ({ prefix, count: ts.length, transforms: ts }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
  if (other.length > 0) {
    out.push({
      prefix: OTHER_GROUP_PREFIX,
      count: other.length,
      transforms: other,
    });
  }
  return out;
}
