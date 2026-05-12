import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

import { IdentityLifecycleCard } from "./identity-lifecycle-card";
import { IdentityProfileCard } from "./identity-profile-card";

/**
 * Overview tab body. Stacked full-width layout: Lifecycle on top so the
 * stepper has room to breathe, Profile below as a multi-column attribute
 * grid. The previous 2-column layout (Profile | Lifecycle) crammed the
 * stepper into ~half the viewport and made it scroll horizontally — moving
 * Lifecycle to a dedicated full-width row fixes that without sacrificing
 * Profile readability (it switches to a 3-column attribute grid on lg).
 *
 * `authoritativeSourceName` is forwarded to the Profile card so admins
 * see the upstream system that feeds this identity (the source flagged
 * `authoritative: true` on its accounts). It's derived in `page.tsx`
 * from the accounts payload to keep this component dumb.
 */
export function IdentityOverview({
  identity,
  authoritativeSourceName,
}: {
  identity: IdentityDetail;
  authoritativeSourceName?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <IdentityLifecycleCard identity={identity} />
      <IdentityProfileCard
        identity={identity}
        authoritativeSourceName={authoritativeSourceName}
      />
    </div>
  );
}
