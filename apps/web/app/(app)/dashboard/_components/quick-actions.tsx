import Link from "next/link";
import {
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type Action = {
  icon: LucideIcon;
  name: string;
  hint: string;
  href: string;
};

/**
 * Dashboard quick actions — 4 entry points to the most frequent flows.
 *
 * Targets the same surfaces the sidebar exposes, but with descriptive
 * affordances so a new user can act on day one.
 */
export function QuickActions() {
  const actions: Action[] = [
    {
      icon: Search,
      name: "Search an identity",
      hint: "by name, email, employee ID",
      href: "/sailpoint/identities",
    },
    {
      icon: Plus,
      name: "Author a transform",
      hint: "test locally before deploying",
      href: "/sailpoint/transforms/new",
    },
    {
      icon: RefreshCw,
      name: "Run aggregation",
      hint: "refresh accounts from a source",
      href: "/sailpoint/sources",
    },
    {
      icon: ShieldCheck,
      name: "Open access review",
      hint: "626 items awaiting",
      href: "/sailpoint/access-requests",
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="px-5 py-4">
        <h2 className="si-section">Quick actions</h2>
      </header>
      <ul className="divide-y border-t">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.name}>
              <Link
                href={a.href}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="si-body font-medium text-foreground">
                    {a.name}
                  </p>
                  <p className="si-caption text-muted-foreground">{a.hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
