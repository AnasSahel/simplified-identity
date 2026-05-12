import Link from "next/link";

import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

/**
 * Overview tab — Profile card.
 *
 * Renders the canonical SailPoint attributes the admin reaches for first.
 * Custom attributes (everything not in this list) live in the Attributes
 * tab — this card stays tight so the Overview is a snapshot, not a full
 * dump.
 *
 * Each row is conditionally rendered: missing values collapse the row
 * rather than printing `—`, which would otherwise clutter the card on
 * tenants with sparse identity profiles.
 */

type Row = { label: string; value: React.ReactNode };

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value || null;
  if (typeof value === "number") return String(value);
  return null;
}

function pickAttr(
  attrs: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const found = str(attrs[key]);
    if (found) return found;
  }
  return null;
}

export function IdentityProfileCard({
  identity,
  authoritativeSourceName,
}: {
  identity: IdentityDetail;
  /**
   * Name of the source flagged `authoritative: true` on the identity's
   * accounts (the source of truth for the identity). Derived in `page.tsx`
   * so the card stays a pure server component without needing the accounts
   * list. `null` collapses the row — we don't fall back to identityProfile
   * because the two concepts (profile == classification, authoritative
   * source == upstream system feeding the identity) are not the same.
   */
  authoritativeSourceName?: string | null;
}) {
  const attrs = identity.attributes ?? {};

  const displayName =
    pickAttr(attrs, ["displayName"]) ?? identity.name ?? identity.id;
  const email = identity.emailAddress ?? pickAttr(attrs, ["email"]);
  const department = pickAttr(attrs, ["department", "cloudDepartment"]);
  const title = pickAttr(attrs, ["title", "jobTitle"]);
  const location = pickAttr(attrs, ["location", "country", "city", "office"]);
  const employeeType =
    pickAttr(attrs, ["employeeType", "identityType", "type"]) ?? null;
  const employeeId = pickAttr(attrs, [
    "employeeNumber",
    "employeeId",
    "personalNumber",
  ]);
  const identityProfile = identity.identityProfile?.name ?? null;
  const joined = pickAttr(attrs, ["hireDate", "startDate"]) ?? identity.created;

  const rows: Row[] = [];
  rows.push({ label: "Full name", value: displayName });
  if (email) rows.push({ label: "Email", value: email });
  if (department) rows.push({ label: "Department", value: department });
  if (title) rows.push({ label: "Title", value: title });
  if (identity.managerRef) {
    rows.push({
      label: "Manager",
      value: (
        <Link
          href={`/identities/${encodeURIComponent(identity.managerRef.id)}`}
          className="underline-offset-2 hover:underline"
        >
          {identity.managerRef.name}
        </Link>
      ),
    });
  }
  if (location) rows.push({ label: "Location", value: location });
  if (employeeType) rows.push({ label: "Type", value: employeeType });
  if (joined)
    rows.push({
      label: "Joined",
      value: joined.slice(0, 10),
    });
  if (identityProfile)
    rows.push({ label: "Identity profile", value: identityProfile });
  if (authoritativeSourceName)
    rows.push({
      label: "Source of truth",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span>{authoritativeSourceName}</span>
          <span
            className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
            title="Authoritative source for this identity"
          >
            Authoritative
          </span>
        </span>
      ),
    });
  if (employeeId) rows.push({ label: "Employee ID", value: employeeId });

  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Profile</h2>
      </header>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-0.5 break-words text-sm text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
