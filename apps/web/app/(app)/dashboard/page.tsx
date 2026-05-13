import Link from "next/link";
import { headers } from "next/headers";
import {
  Activity,
  Compass,
  KeyRound,
  ShieldCheck,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { Pill } from "@/components/ui/pill";
import { auth } from "@/lib/auth";

import { PageShell } from "../_components/page-shell";

type ModuleStatus = "live" | "preview" | "q3-2026" | "q4-2026" | "public";

type Module = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  status: ModuleStatus;
  /**
   * Three stats per card. Values are placeholders until #151 wires real
   * counts (and per-module APIs) — see `TODO(#151)`.
   */
  stats: { label: string; value: string }[];
};

const STATUS_LABEL: Record<ModuleStatus, string> = {
  live: "Live",
  preview: "Preview",
  "q3-2026": "Q3 2026",
  "q4-2026": "Q4 2026",
  public: "Public",
};

const STATUS_TONE: Record<ModuleStatus, "success" | "info" | "neutral"> = {
  live: "success",
  preview: "info",
  "q3-2026": "neutral",
  "q4-2026": "neutral",
  public: "info",
};

// TODO(#151): replace hardcoded stats with real counts fetched from ISC + DB.
const modules: Module[] = [
  {
    title: "Transforms",
    href: "/sailpoint/transforms",
    icon: Wand2,
    description:
      "Author, test and ship SailPoint identity transforms. Visual recipe builder, local evaluator, deploy with one click.",
    status: "live",
    stats: [
      { label: "Built-in", value: "14" },
      { label: "Tenant", value: "84" },
      { label: "Used today", value: "76" },
    ],
  },
  {
    title: "Identities",
    href: "/sailpoint/identities",
    icon: Users,
    description:
      "Unified view of every workforce identity across all connected sources. Lifecycle, accounts, entitlements, risk.",
    status: "live",
    stats: [
      { label: "Total", value: "965" },
      { label: "External", value: "89" },
      { label: "At risk", value: "12" },
    ],
  },
  {
    title: "Sources",
    href: "/sailpoint/sources",
    icon: Activity,
    description:
      "Aggregations, schema drift, orphan accounts and connector errors — at a glance, with one-click drilldown.",
    status: "preview",
    stats: [
      { label: "Connected", value: "28" },
      { label: "In error", value: "3" },
      { label: "Last sync", value: "3m" },
    ],
  },
  {
    title: "Access requests",
    href: "/sailpoint/access-requests",
    icon: KeyRound,
    description:
      "Pending approvals with SLA tracking and one-click delegation. Native ISC integration, no email loops.",
    status: "q3-2026",
    stats: [
      { label: "Pending", value: "1.1k" },
      { label: "SLA at risk", value: "48" },
      { label: "Avg time", value: "2.3d" },
    ],
  },
  {
    title: "Certifications",
    href: "/sailpoint/certifications",
    icon: ShieldCheck,
    description:
      "Live campaigns, completion progress, overdue reviewers. Designed for audit season without spreadsheet hell.",
    status: "q4-2026",
    stats: [
      { label: "Open", value: "626" },
      { label: "Campaigns", value: "4" },
      { label: "Overdue", value: "71" },
    ],
  },
  {
    title: "Roadmap",
    href: "https://github.com/AnasSahel/simplified-identity/issues",
    icon: Compass,
    description:
      "What we're working on next, what's shipped recently, and where to leave feedback that we'll read.",
    status: "public",
    stats: [
      { label: "Shipped", value: "18" },
      { label: "In flight", value: "4" },
      { label: "Backlog", value: "27" },
    ],
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const greetingName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <PageShell
      title={`Welcome back, ${greetingName}.`}
      description={`Signed in as ${session.user.email}. Pick a module below or use the sidebar to navigate.`}
    >
      <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon;
          const isExternal = m.href.startsWith("http");
          return (
            <Link
              key={m.href}
              href={m.href}
              {...(isExternal && { target: "_blank", rel: "noreferrer" })}
              className="group rounded-xl outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <article className="flex h-full flex-col rounded-xl border bg-card p-4 transition-shadow group-hover:shadow-sm">
                <header className="flex items-center gap-3 pb-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="si-section flex-1">{m.title}</h3>
                  <Pill tone={STATUS_TONE[m.status]}>
                    {STATUS_LABEL[m.status]}
                  </Pill>
                </header>
                <p className="si-body flex-1 text-muted-foreground">
                  {m.description}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-3">
                  {m.stats.map((s) => (
                    <div key={s.label}>
                      <dt className="si-micro uppercase text-muted-foreground">
                        {s.label}
                      </dt>
                      <dd className="si-section tabular-nums">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
