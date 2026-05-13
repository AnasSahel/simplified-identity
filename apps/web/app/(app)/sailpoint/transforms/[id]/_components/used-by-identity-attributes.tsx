import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { IdentityAttributeReferencingTransform } from "@/lib/sailpoint/identity-attributes-api";

/**
 * "Used by identity attributes" — surfaces every identity attribute mapping
 * (in any identity profile) that invokes this transform via a
 * `{ type: "reference", attributes: { id: <transformName> } }` node.
 *
 * Why: a transform author needs to know "who depends on me" before changing
 * or deleting it. This is the inverse of the cross-link rendered on the
 * identity-attribute detail page (Transforms tab).
 *
 * UX: when the same attribute is mapped in multiple profiles we collapse it
 * to a single row — `attributeName — in profiles X, Y, Z` — so the section
 * stays scannable. The link target may 404 until #147 lands; that's
 * expected and tracked at the issue level.
 */
export function UsedByIdentityAttributes({
  rows,
  available,
}: {
  rows: ReadonlyArray<IdentityAttributeReferencingTransform>;
  /**
   * False when the upstream `/v2025/identity-profiles` call failed (timeout,
   * 4xx). Surface a neutral message rather than an empty state so the user
   * knows the absence isn't a "no references" signal.
   */
  available: boolean;
}) {
  const grouped = groupByAttribute(rows);

  return (
    <section
      aria-label="Used by identity attributes"
      className="overflow-hidden rounded-lg border bg-card"
    >
      <header className="flex items-center justify-between border-b px-4 py-2">
        <span className="si-caption uppercase tracking-wide text-muted-foreground">
          Used by identity attributes
        </span>
        {available && grouped.length > 0 && (
          <span className="si-caption text-muted-foreground">
            {grouped.length} {grouped.length === 1 ? "attribute" : "attributes"}
          </span>
        )}
      </header>
      <div className="p-4">
        {!available ? (
          <p className="si-body text-muted-foreground">
            Reference data is unavailable — the SailPoint API call failed or
            was denied.
          </p>
        ) : grouped.length === 0 ? (
          <p className="si-body text-muted-foreground">
            No identity attribute references this transform.
          </p>
        ) : (
          <ul className="space-y-2">
            {grouped.map((g) => (
              <li
                key={g.identityAttributeName}
                className="flex items-baseline gap-2"
              >
                <Link
                  href={`/sailpoint/identity-attributes/${encodeURIComponent(
                    g.identityAttributeName,
                  )}`}
                  className="inline-flex items-center gap-1 font-mono text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {g.identityAttributeName}
                  <ArrowUpRight
                    className="h-3 w-3 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
                <span className="si-body text-muted-foreground">
                  — in {g.profileNames.length === 1 ? "profile" : "profiles"}{" "}
                  {g.profileNames.map((name, i) => (
                    <span key={`${name}-${i}`}>
                      <em className="not-italic font-medium text-foreground/80">
                        {name}
                      </em>
                      {i < g.profileNames.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

type GroupedRow = {
  identityAttributeName: string;
  profileNames: string[];
};

/**
 * Collapse multiple (attribute, profile) pairs sharing an attribute name
 * into one row carrying every profile name. Stable ordering: attributes
 * sorted by name, profiles in the order they appeared (which matches the
 * `/v2025/identity-profiles` listing order — typically alphabetical).
 */
function groupByAttribute(
  rows: ReadonlyArray<IdentityAttributeReferencingTransform>,
): GroupedRow[] {
  const byAttr = new Map<string, string[]>();
  for (const r of rows) {
    const existing = byAttr.get(r.identityAttributeName);
    if (existing) {
      if (!existing.includes(r.profileName)) existing.push(r.profileName);
    } else {
      byAttr.set(r.identityAttributeName, [r.profileName]);
    }
  }
  return [...byAttr.entries()]
    .map(([identityAttributeName, profileNames]) => ({
      identityAttributeName,
      profileNames,
    }))
    .sort((a, b) =>
      a.identityAttributeName.localeCompare(b.identityAttributeName),
    );
}
