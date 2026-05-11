/**
 * Find the first non-colliding name in the `<base> (copy[ N])` family.
 *
 * Pure function — kept out of the `"use server"` module because Next.js
 * requires every export from a server-action file to be an async function.
 *
 * Rules:
 *   - If `base` already ends with ` (copy)` or ` (copy N)`, strip that
 *     trailing marker first so a copy of a copy doesn't compound.
 *   - `<base> (copy)` is tried first.
 *   - On collision, `<base> (copy 2)`, `<base> (copy 3)`, etc. until free.
 *   - Bounded to 999 attempts as a sanity guard — past that something is
 *     wrong upstream and we'd rather fail fast than spin.
 */
export function findAvailableCopyName(
  base: string,
  existing: ReadonlySet<string>,
): string | null {
  const stripped = base.replace(/\s\(copy(?:\s\d+)?\)\s*$/, "");
  const first = `${stripped} (copy)`;
  if (!existing.has(first)) return first;
  for (let i = 2; i <= 999; i++) {
    const candidate = `${stripped} (copy ${i})`;
    if (!existing.has(candidate)) return candidate;
  }
  return null;
}
