import type {
  IdentityDetail,
  IdentityProfileLifecycleState,
} from "@/lib/sailpoint/identities-api";

import { IdentityLifecycleCard } from "./identity-lifecycle-card";
import { IdentityProfileCard } from "./identity-profile-card";

type LifecycleStatesResult =
  | { ok: true; data: IdentityProfileLifecycleState[] }
  | { ok: false; status: number; message: string }
  | null;

/**
 * Overview tab body. Stacked full-width layout: Lifecycle on top so the
 * stepper has room to breathe, Profile below as a multi-column attribute
 * grid. The previous 2-column layout (Profile | Lifecycle) crammed the
 * stepper into ~half the viewport and made it scroll horizontally — moving
 * Lifecycle to a dedicated full-width row fixes that without sacrificing
 * Profile readability (it switches to a 3-column attribute grid on lg).
 *
 * `authoritativeSourceName` is forwarded to the Profile card so admins
 * see the upstream system that feeds this identity.
 *
 * `profileLifecycleStatesResult` carries the LCS catalog defined on the
 * identity's Identity Profile. `null` means we didn't fetch (no profile
 * resolved); `ok: false` lets the stepper degrade to the "Identity created"
 * anchor alone.
 */
export function IdentityOverview({
  identity,
  authoritativeSourceName,
  profileLifecycleStatesResult,
}: {
  identity: IdentityDetail;
  authoritativeSourceName?: string | null;
  profileLifecycleStatesResult?: LifecycleStatesResult;
}) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <IdentityLifecycleCard
        identity={identity}
        profileLifecycleStatesResult={profileLifecycleStatesResult ?? null}
      />
      <IdentityProfileCard
        identity={identity}
        authoritativeSourceName={authoritativeSourceName}
      />
    </div>
  );
}
