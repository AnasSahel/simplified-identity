import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";

type ActivityTone = "success" | "warning" | "info" | "danger";

type Event = {
  tone: ActivityTone;
  icon: LucideIcon;
  /**
   * Title can mix prose (`<strong>` for entity names) and mono (`<code>`
   * for identifiers). Pre-rendered to keep this component data-driven.
   */
  title: React.ReactNode;
  meta: string;
  cta: { label: string; href?: string };
};

const TONE_CLASS: Record<ActivityTone, string> = {
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

/**
 * Dashboard recent activity feed — 5 most recent tenant-level events.
 *
 * Values are hardcoded until the real fetch lands.
 *
 * TODO(#151 follow-up): replace hardcoded events with the ISC event
 * audit stream (aggregations, transform deploys, identity LCS changes,
 * risk transitions). 5 most recent, with per-kind icon + tone.
 */
export function RecentActivity() {
  const events: Event[] = [
    {
      tone: "warning",
      icon: AlertTriangle,
      title: (
        <>
          <code className="font-mono">hr-source</code> aggregation failed —
          connector timeout after 90s
        </>
      ),
      meta: "2 min ago · source error · aggr_2026-05-13_00h42",
      cta: { label: "Inspect" },
    },
    {
      tone: "success",
      icon: Check,
      title: (
        <>
          Transform <code className="font-mono">id-displayname</code> deployed
          by you
        </>
      ),
      meta: "14 min ago · v3 → v4 · 312 identities affected",
      cta: { label: "Diff" },
    },
    {
      tone: "info",
      icon: Users,
      title: (
        <>
          3 new identities aggregated from{" "}
          <code className="font-mono">workforce-ad</code>
        </>
      ),
      meta: "1 hour ago · awaiting onboarding lifecycle state",
      cta: { label: "Open", href: "/sailpoint/identities?lcs=prehire" },
    },
    {
      tone: "danger",
      icon: AlertCircle,
      title: (
        <>
          <strong>Sample Identity</strong> still in{" "}
          <code className="font-mono">pendingCorrection</code> for 14 days
        </>
      ),
      meta: "Today · manager unassigned · SLA breach risk",
      cta: { label: "Review" },
    },
    {
      tone: "info",
      icon: Clock,
      title: (
        <>
          Scheduled aggregation completed across <strong>14 sources</strong>
        </>
      ),
      meta: "3 hours ago · 8,742 accounts processed · 0 errors",
      cta: { label: "Report" },
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between px-5 py-4">
        <h2 className="si-section">Recent activity</h2>
        <Link
          href="/sailpoint/identities"
          className="si-caption text-primary hover:underline"
        >
          View all →
        </Link>
      </header>
      <ul className="divide-y border-t">
        {events.map((e, idx) => {
          const Icon = e.icon;
          const cta = e.cta.href ? (
            <Link
              href={e.cta.href}
              className="si-micro inline-flex h-7 items-center rounded-md border px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {e.cta.label}
            </Link>
          ) : (
            <button
              type="button"
              className="si-micro inline-flex h-7 items-center rounded-md border px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {e.cta.label}
            </button>
          );
          return (
            <li key={idx} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[e.tone]}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="si-body text-foreground">{e.title}</p>
                <p className="si-caption mt-0.5 text-muted-foreground">
                  {e.meta}
                </p>
              </div>
              <div className="self-center">{cta}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
