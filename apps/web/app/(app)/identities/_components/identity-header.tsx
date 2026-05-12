import Link from "next/link";

import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

import { DetailHeader } from "../../_components/detail-shell";
import { AvatarInitials } from "./avatar-initials";
import { LifecyclePill } from "./lifecycle-pill";
import { ProcessIdentityButton } from "./process-button";

/**
 * Domain wrapper around `<DetailHeader>` for identities. Surfaces the
 * email + profile + manager + updated-since metadata as a subtitle line,
 * with a lifecycle pill as the badge.
 */
export function IdentityHeader({ identity }: { identity: IdentityDetail }) {
  const lcs = identity.lifecycleState?.stateName ?? null;
  const profile = identity.identityProfile;
  const manager = identity.managerRef;
  const modified = relativeTime(identity.modified);
  const email = identity.emailAddress ?? null;

  return (
    <DetailHeader
      avatar={
        <AvatarInitials
          name={identity.name}
          className="h-12 w-12 text-sm"
        />
      }
      title={identity.name || identity.id}
      badges={<LifecyclePill state={lcs} />}
      subtitle={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {email && <span className="text-foreground">{email}</span>}
          {profile?.name && (
            <>
              <span aria-hidden>·</span>
              <span>
                <span>Profile </span>
                <span className="text-foreground">{profile.name}</span>
              </span>
            </>
          )}
          {manager && (
            <>
              <span aria-hidden>·</span>
              <span>
                <span>Manager </span>
                <Link
                  href={`/identities/${encodeURIComponent(manager.id)}`}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {manager.name}
                </Link>
              </span>
            </>
          )}
          {modified && (
            <>
              <span aria-hidden>·</span>
              <span suppressHydrationWarning>updated {modified}</span>
            </>
          )}
        </div>
      }
      actions={
        <ProcessIdentityButton
          id={identity.id}
          name={identity.name || identity.id}
        />
      }
    />
  );
}

function relativeTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  // Locale pinned to en-US so SSR / client output match. The `suppress-
  // HydrationWarning` on the rendering span absorbs the residual drift
  // when the actual value crosses a boundary between render and hydration.
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000)
    return rtf.format(Math.round(seconds / 2_592_000), "month");
  return rtf.format(Math.round(seconds / 31_536_000), "year");
}
