import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { IdentityDetail } from "@/lib/sailpoint/identities-api";

import { LifecyclePill } from "./lifecycle-pill";

function relativeTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  // Locale pinned to en-US so SSR / client output match. The `suppress-
  // HydrationWarning` on the rendering span absorbs the residual drift
  // when the actual value crosses a boundary (e.g. "59 seconds ago" SSR
  // → "1 minute ago" client) between render and hydration.
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000)
    return rtf.format(Math.round(seconds / 2_592_000), "month");
  return rtf.format(Math.round(seconds / 31_536_000), "year");
}

export function IdentityHeader({ identity }: { identity: IdentityDetail }) {
  const lcs = identity.lifecycleState?.stateName ?? null;
  const profile = identity.identityProfile;
  const manager = identity.managerRef;
  const modified = relativeTime(identity.modified);
  const email = identity.emailAddress ?? null;

  return (
    <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {identity.name || identity.id}
          </h1>
          <LifecyclePill state={lcs} />
        </div>
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {email && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Email</dt>
              <dd className="text-foreground">{email}</dd>
            </div>
          )}
          {profile?.name && (
            <>
              <span aria-hidden>·</span>
              <div className="flex items-center gap-1.5">
                <dt>Profile</dt>
                <dd className="text-foreground">{profile.name}</dd>
              </div>
            </>
          )}
          {manager && (
            <>
              <span aria-hidden>·</span>
              <div className="flex items-center gap-1.5">
                <dt>Manager</dt>
                <dd>
                  <Link
                    href={`/identities/${encodeURIComponent(manager.id)}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {manager.name}
                  </Link>
                </dd>
              </div>
            </>
          )}
          {modified && (
            <>
              <span aria-hidden>·</span>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Updated</dt>
                <dd suppressHydrationWarning>updated {modified}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
      <div className="flex items-center gap-2 md:shrink-0">
        {/* Wiring lands in #93. Placeholder so the slot exists today. */}
        <Button disabled title="Available once #93 lands">
          Process identity
        </Button>
      </div>
    </div>
  );
}
