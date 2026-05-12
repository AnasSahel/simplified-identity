import Link from "next/link";

import { cn } from "@/lib/utils";
import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

import { LifecyclePill } from "./lifecycle-pill";

/**
 * Standard attribute keys are the ones SailPoint promotes to top-level on
 * the identity payload + the well-known custom-but-conventional ones the
 * UX surfaces explicitly. Everything else falls through to the Custom
 * section.
 */
const STANDARD_KEYS = new Set([
  "displayName",
  "firstname",
  "lastname",
  "uid",
  "email",
  "manager",
]);

type Row = {
  label: string;
  value: React.ReactNode;
  /**
   * Marks the row as derived from a source-controlled mapping when we can
   * detect it. Today only `lifecycleState.manuallyUpdated` gives us a
   * trustworthy signal; everything else stays unbadged.
   */
  badge?: "source-controlled" | "manual";
};

function attrText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-md border bg-card">
        <dl className="divide-y">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[200px_1fr_auto] sm:items-center sm:gap-3"
            >
              <dt className="text-xs font-medium text-muted-foreground sm:text-sm">
                {row.label}
              </dt>
              <dd className="break-words text-sm text-foreground">
                {row.value}
              </dd>
              <span
                className={cn(
                  "justify-self-start text-[10px] font-medium uppercase tracking-wide sm:justify-self-end",
                  row.badge ? "text-muted-foreground" : "invisible",
                )}
                aria-hidden={!row.badge}
              >
                {row.badge === "source-controlled" && (
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5">
                    Source-controlled
                  </span>
                )}
                {row.badge === "manual" && (
                  <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    Manually updated
                  </span>
                )}
              </span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function AttributesTab({ identity }: { identity: IdentityDetail }) {
  const attrs = identity.attributes ?? {};

  const standard: Row[] = [
    {
      label: "Display name",
      value: attrText(
        attrs.displayName ?? identity.name ?? identity.id,
      ),
    },
    {
      label: "Email",
      value: identity.emailAddress
        ? identity.emailAddress
        : attrText(attrs.email),
    },
    {
      label: "First name",
      value: attrText(attrs.firstname ?? attrs.firstName),
    },
    {
      label: "Last name",
      value: attrText(attrs.lastname ?? attrs.lastName),
    },
    {
      label: "Manager",
      value: identity.managerRef ? (
        <Link
          href={`/sailpoint/identities/${encodeURIComponent(identity.managerRef.id)}`}
          className="underline-offset-2 hover:underline"
        >
          {identity.managerRef.name}
        </Link>
      ) : (
        "—"
      ),
    },
    {
      label: "Lifecycle state",
      value: <LifecyclePill state={identity.lifecycleState?.stateName} />,
      badge: identity.lifecycleState?.manuallyUpdated ? "manual" : undefined,
    },
  ];

  // Custom rows: everything in attributes not classified as standard.
  // Sort alphabetically for predictable reads on tenants with dozens of
  // custom attrs.
  const customRows: Row[] = Object.entries(attrs)
    .filter(([key]) => !STANDARD_KEYS.has(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ label: key, value: attrText(value) }));

  return (
    <div className="space-y-6 pt-4">
      <Section title="Standard" rows={standard} />
      <Section title="Custom" rows={customRows} />
    </div>
  );
}
