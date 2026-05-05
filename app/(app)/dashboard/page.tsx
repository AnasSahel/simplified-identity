import { headers } from "next/headers";
import { Activity, KeyRound, ShieldCheck, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

const placeholders = [
  {
    title: "Source health",
    icon: Activity,
    description: "Aggregations, errors, and orphan accounts at a glance.",
  },
  {
    title: "Access requests",
    icon: KeyRound,
    description: "Pending requests, SLA, and one-click approvals.",
  },
  {
    title: "Identities",
    icon: Users,
    description: "Lifecycle states, joiners, movers, leavers.",
  },
  {
    title: "Certifications",
    icon: ShieldCheck,
    description: "Campaigns in flight, completion, and overdue items.",
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const greetingName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Signed in as {session.user.email}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {greetingName}.
        </h1>
        <p className="text-muted-foreground">
          Your SailSimplified workspace is ready. Modules below are placeholders
          — they&apos;ll come online as we ship.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {placeholders.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} className="bg-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
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
                  Coming soon
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
