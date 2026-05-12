import { cn } from "@/lib/utils";
import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

/**
 * Overview tab — Lifecycle card.
 *
 * Minimal 3-step timeline grounded in ISC primitives:
 *
 *   1. Identity created          — `identity.created`
 *   2. Current lifecycle state   — `identity.lifecycleState.stateName`
 *                                  timestamp = `identity.modified` (imperfect:
 *                                  it's the last touch on any attribute, not
 *                                  the exact LCS transition — but that's the
 *                                  closest primitive without joining an
 *                                  events search)
 *   3. Off-boarding              — placeholder while the identity is alive,
 *                                  becomes real once LCS hits `terminated`.
 *
 * Mockup originally included "Birthright access granted +1 day" which we
 * dropped — ISC doesn't surface that as a discrete event. Re-introduce
 * later if we wire an events feed.
 */

type Tone = "done" | "current" | "pending";

function relativeTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000)
    return rtf.format(Math.round(seconds / 2_592_000), "month");
  return rtf.format(Math.round(seconds / 31_536_000), "year");
}

function Dot({ tone }: { tone: Tone }) {
  return (
    <span
      className={cn(
        "relative z-10 mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2",
        tone === "done" &&
          "border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400",
        tone === "current" &&
          "border-sky-500 bg-sky-500 dark:border-sky-400 dark:bg-sky-400",
        tone === "pending" && "border-muted-foreground/30 bg-background",
      )}
      aria-hidden
    />
  );
}

function Step({
  tone,
  title,
  meta,
  last,
}: {
  tone: Tone;
  title: React.ReactNode;
  meta: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          className="absolute left-1 top-3 h-full w-px bg-border"
          aria-hidden
        />
      )}
      <Dot tone={tone} />
      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            tone === "pending" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "text-xs",
            tone === "pending"
              ? "text-muted-foreground/70"
              : "text-muted-foreground",
          )}
          suppressHydrationWarning
        >
          {meta}
        </p>
      </div>
    </li>
  );
}

export function IdentityLifecycleCard({
  identity,
}: {
  identity: IdentityDetail;
}) {
  const stateName = identity.lifecycleState?.stateName ?? null;
  const isTerminated =
    typeof stateName === "string" &&
    /terminated|off.?board|leaver/i.test(stateName);

  const createdMeta = identity.created
    ? identity.created.slice(0, 10)
    : "unknown date";

  const stateMeta = identity.modified
    ? (relativeTime(identity.modified) ?? identity.modified.slice(0, 10))
    : "—";

  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Lifecycle</h2>
      </header>
      <ol className="px-4 py-4">
        <Step tone="done" title="Identity created" meta={createdMeta} />
        <Step
          tone={isTerminated ? "done" : "current"}
          title={
            stateName ? (
              <>
                Current state:{" "}
                <span className="font-semibold capitalize">{stateName}</span>
              </>
            ) : (
              "Current state: —"
            )
          }
          meta={stateMeta}
        />
        <Step
          tone={isTerminated ? "current" : "pending"}
          title="Off-boarding"
          meta={isTerminated ? stateMeta : "—"}
          last
        />
      </ol>
    </section>
  );
}
