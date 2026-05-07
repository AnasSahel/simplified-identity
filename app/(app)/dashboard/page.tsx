import Link from "next/link";
import { headers } from "next/headers";
import { Activity, KeyRound, ShieldCheck, Users, Wand2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

import { PageHeader } from "../_components/page-header";

const placeholders = [
  {
    title: "Sources",
    href: "/sources",
    icon: Activity,
    description: "Aggregations, errors, and orphan accounts at a glance.",
  },
  {
    title: "Identities",
    href: "/identities",
    icon: Users,
    description: "Lifecycle states, joiners, movers, leavers.",
  },
  {
    title: "Transforms",
    href: "/transforms",
    icon: Wand2,
    description: "Author, test, and ship SailPoint identity transforms.",
    ready: true,
  },
  {
    title: "Access requests",
    href: "/access-requests",
    icon: KeyRound,
    description: "Pending requests, SLA, and one-click approvals.",
  },
  {
    title: "Certifications",
    href: "/certifications",
    icon: ShieldCheck,
    description: "Campaigns in flight, completion, and overdue items.",
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const greetingName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader
        title={`Welcome back, ${greetingName}.`}
        description={`Signed in as ${session.user.email}. Pick a module below or use the sidebar to navigate.`}
      />
      <div className="grid gap-4 pt-8 sm:grid-cols-2 lg:grid-cols-3">
        {placeholders.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.href}
              href={p.href}
              className="group rounded-xl outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full bg-card transition-colors group-hover:bg-accent/40">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                  </div>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                </CardHeader>
                <CardContent>
                  <CardDescription>{p.description}</CardDescription>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {p.ready ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Available
                      </span>
                    ) : (
                      "Coming soon"
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
