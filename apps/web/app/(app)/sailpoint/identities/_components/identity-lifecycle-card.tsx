import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import type {
  IdentityDetail,
  IdentityProfileLifecycleState,
} from "@/lib/sailpoint/identities-api";

import { LifecyclePill } from "./lifecycle-pill";

/**
 * Overview tab — Lifecycle card.
 *
 * Renders the full catalog of LCS configured on the identity's Identity
 * Profile as a horizontal wrap of pills, with the identity's *current*
 * LCS highlighted via `<LifecyclePill>` (so it inherits the stateful tone
 * already used in the table + header — visual consistency).
 *
 * Degraded views:
 *  - No profile attached (`profileLifecycleStatesResult === null`)
 *    → render the current LCS pill alone.
 *  - Fetch failed (`!result.ok`) → current LCS pill + muted error note;
 *    common case is 403 if the user lacks the identity-profile scope.
 *  - Current LCS not present in the profile catalog (stale data, or LCS
 *    deleted from the profile after assignment) → prepend the current
 *    pill with a "(not in profile)" muted suffix so the inconsistency is
 *    visible instead of silently dropped.
 *
 * Match rule: `identity.lifecycleState.stateName` ≈ LCS `technicalName`
 * on most tenants, but tenants whose technicalName equals the display
 * name fall through `name`. Compare case-insensitively on both.
 */

type LifecycleStatesResult =
  | { ok: true; data: IdentityProfileLifecycleState[] }
  | { ok: false; status: number; message: string }
  | null;

function matchesCurrent(
  lcs: IdentityProfileLifecycleState,
  current: string | null,
): boolean {
  if (!current) return false;
  const c = current.toLowerCase();
  return (
    lcs.technicalName?.toLowerCase() === c ||
    lcs.name?.toLowerCase() === c
  );
}

export function IdentityLifecycleCard({
  identity,
  profileLifecycleStatesResult,
}: {
  identity: IdentityDetail;
  profileLifecycleStatesResult: LifecycleStatesResult;
}) {
  const currentStateName = identity.lifecycleState?.stateName ?? null;
  const isManual = identity.lifecycleState?.manuallyUpdated === true;

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Lifecycle</h2>
        {isManual && (
          <Pill
            tone="warning"
            title="Lifecycle state set manually; overrides the profile's computed state until the driving attribute changes."
          >
            manual override
          </Pill>
        )}
      </header>
      <div className="px-4 py-4">
        <LifecycleBody
          currentStateName={currentStateName}
          result={profileLifecycleStatesResult}
        />
      </div>
    </section>
  );
}

function LifecycleBody({
  currentStateName,
  result,
}: {
  currentStateName: string | null;
  result: LifecycleStatesResult;
}) {
  // No profile attached on the identity — render just the current pill.
  if (result === null) {
    return <LifecyclePill state={currentStateName} />;
  }

  // Fetch failure — degrade to current pill + muted error note.
  if (!result.ok) {
    return (
      <div className="space-y-1.5">
        <LifecyclePill state={currentStateName} />
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load the profile&apos;s lifecycle states
          {result.status > 0 ? ` (${result.status})` : ""}.
        </p>
      </div>
    );
  }

  const states = result.data;

  if (states.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No lifecycle states defined on this profile.
      </p>
    );
  }

  const matched = states.some((lcs) => matchesCurrent(lcs, currentStateName));

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Lifecycle states">
      {!matched && currentStateName && (
        <li>
          <span className="inline-flex items-center gap-1.5">
            <LifecyclePill state={currentStateName} />
            <span
              className="text-xs text-muted-foreground"
              title="The identity is in a state that is no longer defined on its Identity Profile."
            >
              (not in profile)
            </span>
          </span>
        </li>
      )}
      {states.map((lcs) => {
        const isCurrent = matchesCurrent(lcs, currentStateName);
        const label = lcs.name || lcs.technicalName;
        const titleParts = [
          lcs.technicalName ? `technical: ${lcs.technicalName}` : null,
          lcs.description || null,
          lcs.enabled ? null : "disabled",
        ].filter(Boolean);
        const title = titleParts.length > 0 ? titleParts.join(" — ") : undefined;

        return (
          <li key={lcs.id}>
            {isCurrent ? (
              <span
                className="inline-block"
                aria-current="true"
                title={title}
              >
                <LifecyclePill state={label} dot />
              </span>
            ) : (
              <Pill
                tone="neutral"
                className={cn(
                  !lcs.enabled && "line-through opacity-60",
                )}
                title={title}
              >
                {label}
              </Pill>
            )}
          </li>
        );
      })}
    </ul>
  );
}
