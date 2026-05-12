import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

import { IdentityLifecycleCard } from "./identity-lifecycle-card";
import { IdentityProfileCard } from "./identity-profile-card";

/**
 * Overview tab body. Two-column responsive layout: Profile on the left,
 * Lifecycle on the right. Stacks on small screens.
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
    <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
      <IdentityProfileCard
        identity={identity}
        authoritativeSourceName={authoritativeSourceName}
      />
      <IdentityLifecycleCard identity={identity} />
    </div>
  );
}
