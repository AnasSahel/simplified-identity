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
 * Overview tab body. Two-column responsive layout: Profile on the left,
 * Lifecycle on the right. Stacks on small screens.
 *
 * `authoritativeSourceName` is forwarded to the Profile card so admins
 * see the upstream system that feeds this identity (the source flagged
 * `authoritative: true` on its accounts). It's derived in `page.tsx`
 * from the accounts payload to keep this component dumb.
 *
 * `profileLifecycleStatesResult` carries the LCS catalog for the identity's
 * Identity Profile. `null` means we didn't even try to fetch (no profile id);
 * a falsy `ok` lets the card render a degraded view (current LCS pill only).
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
    <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
      <IdentityProfileCard
        identity={identity}
        authoritativeSourceName={authoritativeSourceName}
      />
      <IdentityLifecycleCard
        identity={identity}
        profileLifecycleStatesResult={profileLifecycleStatesResult ?? null}
      />
    </div>
  );
}
