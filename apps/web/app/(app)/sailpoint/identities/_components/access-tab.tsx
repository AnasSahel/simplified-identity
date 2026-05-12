import type { IdentityAccessItem } from "@/lib/sailpoint/identities-api";

type Group = {
  title: string;
  /** Match the SailPoint `accessType` string for this group. */
  match: (item: IdentityAccessItem) => boolean;
};

const GROUPS: Group[] = [
  {
    title: "Access profiles",
    match: (i) => i.accessType?.toUpperCase() === "ACCESS_PROFILE",
  },
  {
    title: "Roles",
    match: (i) => i.accessType?.toUpperCase() === "ROLE",
  },
  {
    title: "Entitlements",
    match: (i) => i.accessType?.toUpperCase() === "ENTITLEMENT",
  },
];

function originLabel(item: IdentityAccessItem): string {
  // SailPoint's access-items endpoint annotates entitlements with the
  // mechanism that granted them (direct, via role, via access profile).
  // The exact field varies per accessType, so we sniff a couple of common
  // ones — the issue calls for a hint, not a strict label.
  const raw = item as unknown as Record<string, unknown>;
  const candidates = ["source", "via", "origin", "grantedBy", "assignment"];
  for (const key of candidates) {
    const value = raw[key];
    if (typeof value === "string" && value) return value;
  }
  if (item.standalone === true) return "manual";
  return "—";
}

function AccessItemRow({ item }: { item: IdentityAccessItem }) {
  return (
    <li className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {item.name || item.id}
        </p>
        {item.description && (
          <p className="truncate text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground sm:text-right">
        Origin: <span className="text-foreground">{originLabel(item)}</span>
      </span>
      <span className="text-xs text-muted-foreground sm:text-right">
        {item.sourceName ? (
          <>Source: <span className="text-foreground">{item.sourceName}</span></>
        ) : (
          "—"
        )}
      </span>
    </li>
  );
}

function GroupSection({
  title,
  items,
}: {
  title: string;
  items: IdentityAccessItem[];
}) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}{" "}
        <span className="text-muted-foreground/70">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <div className="rounded-md border bg-card px-4 py-4 text-sm text-muted-foreground">
          None.
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-md border bg-card">
          {items.map((item) => (
            <AccessItemRow key={`${item.accessType}:${item.id}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AccessTab({ items }: { items: IdentityAccessItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No access assigned to this identity.
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {GROUPS.map((group) => (
        <GroupSection
          key={group.title}
          title={group.title}
          items={items.filter(group.match)}
        />
      ))}
    </div>
  );
}
