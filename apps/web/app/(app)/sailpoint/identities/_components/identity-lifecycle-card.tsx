import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  IdentityDetail,
  IdentityProfileLifecycleState,
} from "@/lib/sailpoint/identities-api";

/**
 * Overview tab — Lifecycle card.
 *
 * Horizontal stepper rendering the identity's journey:
 *   1. Identity created (always first — narrative anchor, derived from
 *      `identity.created`)
 *   2..N. Enabled LCS from the Identity Profile, sorted in canonical
 *      narrative order (preHire → onboarding → active → leave → offboarding
 *      → terminated → archived → unknowns at the end).
 *
 * Tones derive from each step's position relative to the identity's
 * current LCS:
 *  - `done`     = steps strictly before the current one (incl. "Identity
 *                 created") → emerald fill + Check icon
 *  - `current`  = the step whose technicalName/name matches
 *                 `identity.lifecycleState.stateName` → primary fill
 *  - `pending`  = steps strictly after the current one → muted outline
 *
 * Connectors are absolute-positioned so they align precisely with each
 * dot's vertical center (top: 11px = `(h-6 - h-px) / 2`) and span from
 * the right edge of one dot to the next, regardless of column width.
 *
 * Degraded views:
 *  - No profile resolved → stepper shows only the "Identity created" dot.
 *  - 403 / fetch error → same.
 *
 * Disabled LCS are filtered out — a disabled state isn't a valid stop on
 * the journey and would render as a dead-end node.
 */

type Tone = "done" | "current" | "pending";

type LifecycleStatesResult =
  | { ok: true; data: IdentityProfileLifecycleState[] }
  | { ok: false; status: number; message: string }
  | null;

type Step = {
  key: string;
  title: string;
  meta: string;
  tone: Tone;
};

/**
 * Canonical narrative order. Lower weight = earlier on the timeline.
 * Match is case-insensitive on `technicalName` OR `name`; unknown LCS
 * fall to the tail with `100` so they appear at the end (stable-sorted
 * among themselves by API order).
 */
const ORDER: Array<{ rx: RegExp; weight: number }> = [
  { rx: /^pre[-_ ]?hire$/i, weight: 10 },
  { rx: /^scheduled$/i, weight: 15 },
  { rx: /^onboarding$/i, weight: 20 },
  { rx: /^active$/i, weight: 30 },
  { rx: /^pending[-_ ]?correction$/i, weight: 35 },
  { rx: /^leave([-_ ]of[-_ ]absence)?$/i, weight: 40 },
  { rx: /^off[-_ ]?boarding$/i, weight: 50 },
  { rx: /^terminated$/i, weight: 60 },
  { rx: /^archived$/i, weight: 70 },
];

function lcsWeight(lcs: IdentityProfileLifecycleState): number {
  const candidates = [lcs.technicalName, lcs.name].filter(Boolean) as string[];
  for (const c of candidates) {
    const hit = ORDER.find((o) => o.rx.test(c));
    if (hit) return hit.weight;
  }
  return 100;
}

function matchesCurrent(
  lcs: IdentityProfileLifecycleState,
  current: string | null,
): boolean {
  if (!current) return false;
  const c = current.toLowerCase();
  return (
    lcs.technicalName?.toLowerCase() === c || lcs.name?.toLowerCase() === c
  );
}

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

function buildSteps(
  identity: IdentityDetail,
  lcsList: IdentityProfileLifecycleState[],
): Step[] {
  const currentStateName = identity.lifecycleState?.stateName ?? null;

  // Filter out disabled LCS and sort canonically. Stable sort: ties (e.g.
  // two LCS that both fall to weight 100) keep the API order.
  const sorted = lcsList
    .filter((lcs) => lcs.enabled !== false)
    .map((lcs, apiIndex) => ({ lcs, apiIndex, weight: lcsWeight(lcs) }))
    .sort((a, b) =>
      a.weight !== b.weight ? a.weight - b.weight : a.apiIndex - b.apiIndex,
    )
    .map((x) => x.lcs);

  // Find the current step's index (in the sorted list) to drive tones.
  const currentIdx = sorted.findIndex((lcs) =>
    matchesCurrent(lcs, currentStateName),
  );

  const createdDate = isoDate(identity.created) ?? "—";
  const lcsRelative = identity.modified
    ? (relativeTime(identity.modified) ?? isoDate(identity.modified) ?? "—")
    : "—";

  // Identity created is always step 0, always done.
  const steps: Step[] = [
    {
      key: "__created__",
      title: "Identity created",
      meta: createdDate,
      tone: "done",
    },
  ];

  sorted.forEach((lcs, i) => {
    let tone: Tone;
    if (currentIdx === -1) {
      // Current state isn't in the catalog (stale data / removed LCS).
      // Render everything as pending to avoid lying about progression.
      tone = "pending";
    } else if (i < currentIdx) {
      tone = "done";
    } else if (i === currentIdx) {
      tone = "current";
    } else {
      tone = "pending";
    }

    steps.push({
      key: lcs.id,
      title: lcs.name || lcs.technicalName,
      meta: tone === "current" ? lcsRelative : tone === "done" ? "—" : "—",
      tone,
    });
  });

  return steps;
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

export function IdentityLifecycleCard({
  identity,
  profileLifecycleStatesResult,
}: {
  identity: IdentityDetail;
  profileLifecycleStatesResult: LifecycleStatesResult;
}) {
  const lcsList =
    profileLifecycleStatesResult?.ok === true
      ? profileLifecycleStatesResult.data
      : [];

  const steps = buildSteps(identity, lcsList);
  const fetchFailed = profileLifecycleStatesResult?.ok === false;

  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Lifecycle</h2>
      </header>
      <div className="px-4 py-5">
        <ol
          className="relative grid auto-cols-fr grid-flow-col gap-0"
          aria-label="Identity lifecycle journey"
        >
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            // The connector AFTER this step is "active" (emerald) when this
            // step is done. A current step gets a muted connector pointing
            // to pending steps; pending → pending is also muted.
            const connectorActive = step.tone === "done";

            return (
              <li
                key={step.key}
                className="relative flex min-w-0 flex-col items-start gap-2"
              >
                <Dot tone={step.tone} />
                {/* Connector — absolutely positioned so it aligns to the
                    dot's vertical center regardless of label height.
                    Starts at the right edge of the dot (left: 1.5rem) and
                    extends to the start of the next cell (right: 0). */}
                {!isLast && (
                  <span
                    className={cn(
                      "pointer-events-none absolute h-px",
                      connectorActive
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : "bg-border",
                    )}
                    style={{ top: "11px", left: "1.5rem", right: 0 }}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 pr-3">
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
              </li>
            );
          })}
        </ol>
        {fetchFailed && (
          <p className="mt-3 text-xs text-muted-foreground">
            Couldn&apos;t load the profile&apos;s lifecycle states
            {profileLifecycleStatesResult.status > 0
              ? ` (${profileLifecycleStatesResult.status})`
              : ""}
            . Showing the creation anchor only.
          </p>
        )}
      </div>
    </section>
  );
}
