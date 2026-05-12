import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

/**
 * Overview tab — Lifecycle card.
 *
 * Horizontal 5-step stepper rendered as a journey through the identity's
 * lifecycle milestones:
 *
 *   1. Onboarded         — date = `identity.created` (proxy: ISC doesn't
 *                          surface a distinct "onboarding completed" event)
 *   2. Identity created  — date = `identity.created`
 *   3. Birthright access — `+1 day` (conventional offset; ISC doesn't surface
 *                          birthright grant as a discrete event either)
 *   4. <current LCS>     — dynamic label = `lifecycleState.stateName`,
 *                          timestamp = relative `identity.modified`
 *   5. Off-boarding      — pending unless the current LCS belongs to the
 *                          terminating set (terminated / offboard* / archived
 *                          / leaver), in which case it folds into "done"
 *                          and step 4 sits as the off-boarding step itself.
 *
 * Notes :
 *  - Done circle  = emerald-500 fill + white Check (matches design mockup)
 *  - Current      = primary fill, no icon
 *  - Pending      = bg-background + muted ring
 *  - Connectors   = horizontal line between adjacent steps, colored emerald
 *                   up to and including the current step, muted afterwards
 *  - Wrap policy  = horizontal scroll on small screens (no wrap — the
 *                   stepper would lose its progression signal if it wrapped
 *                   mid-flow)
 */

type Tone = "done" | "current" | "pending";

const TERMINATING_RE = /terminat|off.?board|archiv|leaver/i;

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

function isoDate(iso: string | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

type Step = {
  key: string;
  title: string;
  meta: string;
  tone: Tone;
};

function buildSteps(identity: IdentityDetail): Step[] {
  const stateName = identity.lifecycleState?.stateName ?? null;
  const isTerminated =
    typeof stateName === "string" && TERMINATING_RE.test(stateName);

  const createdDate = isoDate(identity.created) ?? "—";
  const lcsRelative = identity.modified
    ? (relativeTime(identity.modified) ?? isoDate(identity.modified) ?? "—")
    : "—";
  const lcsLabel = stateName ? capitalize(stateName) : "—";

  return [
    {
      key: "onboarded",
      title: "Onboarded",
      meta: createdDate,
      tone: "done",
    },
    {
      key: "created",
      title: "Identity created",
      meta: createdDate,
      tone: "done",
    },
    {
      key: "birthright",
      title: "Birthright access",
      meta: "+1 day",
      tone: "done",
    },
    {
      key: "current",
      title: lcsLabel,
      meta: lcsRelative,
      tone: isTerminated ? "done" : "current",
    },
    {
      key: "offboarding",
      title: "Off-boarding",
      meta: isTerminated ? lcsRelative : "—",
      tone: isTerminated ? "current" : "pending",
    },
  ];
}

function Dot({ tone }: { tone: Tone }) {
  return (
    <span
      className={cn(
        "relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
        tone === "done" &&
          "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
        tone === "current" &&
          "border-primary bg-primary text-primary-foreground",
        tone === "pending" && "border-muted-foreground/30 bg-background",
      )}
      aria-hidden
    >
      {tone === "done" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "h-px flex-1 self-start",
        active ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border",
      )}
      style={{ marginTop: "11px" }}
      aria-hidden
    />
  );
}

export function IdentityLifecycleCard({
  identity,
}: {
  identity: IdentityDetail;
}) {
  const steps = buildSteps(identity);

  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Lifecycle</h2>
      </header>
      <div className="overflow-x-auto px-4 py-5">
        <ol
          className="flex min-w-fit items-start"
          aria-label="Identity lifecycle journey"
        >
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            // The connector AFTER this step is "active" (emerald) if both
            // this step and the next step are done, OR if this step is done
            // and the next one is current. Pending → after = muted.
            const next = steps[i + 1];
            const connectorActive =
              !isLast &&
              step.tone !== "pending" &&
              next !== undefined &&
              next.tone !== "pending";

            return (
              <li
                key={step.key}
                className={cn(
                  "flex flex-1 items-start",
                  // All steps share width equally so the dots distribute
                  // evenly across the card. Last step has no trailing
                  // connector — handled below.
                  "min-w-[140px]",
                )}
              >
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <Dot tone={step.tone} />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight",
                        step.tone === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        step.tone === "pending"
                          ? "text-muted-foreground/70"
                          : "text-muted-foreground",
                      )}
                      suppressHydrationWarning
                    >
                      {step.meta}
                    </p>
                  </div>
                </div>
                {!isLast && <Connector active={connectorActive} />}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
