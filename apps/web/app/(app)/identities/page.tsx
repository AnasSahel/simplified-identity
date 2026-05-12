import { headers } from "next/headers";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/auth";
import {
  listIdentities,
  listIdentityProfiles,
  type IdentitySummary,
} from "@/lib/sailpoint/identities-api";
import { cn } from "@/lib/utils";

import { PageHeader } from "../_components/page-header";
import { SailpointEmptyState } from "../_components/sailpoint-empty-state";
import { IdentitiesTable, type IdentityRow } from "./_components/identities-table";
import { LcsFilter } from "./_components/lcs-filter";
import { ProfileFilter } from "./_components/profile-filter";
import { SearchBox } from "./_components/search-box";

const PAGE_SIZES = [25, 50, 100, 250] as const;
type PerPage = (typeof PAGE_SIZES)[number];
const DEFAULT_PER: PerPage = 25;
const MAX_PER: PerPage = 250;

function perFromParam(value: string | undefined): PerPage {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n)
    ? (n as PerPage)
    : DEFAULT_PER;
}

function pageFromParam(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function lcsFromParam(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  // We don't restrict the URL to the dropdown's set on purpose — a tenant
  // with a custom state name can still deep-link to it.
  return v || null;
}

/**
 * Compose the SailPoint `filters` expression from the URL state.
 *
 * Search hits `name`, `email`, and `attributes.employeeNumber` with `co`
 * (contains). Profile and LCS use `eq`. We escape quotes in the user input
 * so a query like `it"s` doesn't break the expression — SailPoint requires
 * standard string literals.
 */
function buildFilters(opts: {
  q: string;
  profile: string | null;
  lcs: string | null;
}): string | undefined {
  const parts: string[] = [];

  if (opts.q) {
    const safe = opts.q.replace(/"/g, '\\"');
    parts.push(
      `(name co "${safe}" or email co "${safe}" or attributes.employeeNumber co "${safe}")`,
    );
  }
  if (opts.profile) {
    parts.push(`identityProfile.id eq "${opts.profile.replace(/"/g, '\\"')}"`);
  }
  if (opts.lcs) {
    parts.push(`lifecycleState eq "${opts.lcs.replace(/"/g, '\\"')}"`);
  }

  return parts.length ? parts.join(" and ") : undefined;
}

function buildHref(
  base: string,
  searchParams: URLSearchParams,
  overrides: Record<string, string | null>,
): string {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function pagesToRender(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function toRow(identity: IdentitySummary): IdentityRow {
  return {
    id: identity.id,
    name: identity.name ?? identity.id,
    email: identity.emailAddress ?? null,
    profileName: identity.identityProfile?.name ?? null,
    lifecycleState: identity.lifecycleState?.stateName ?? null,
    manager: identity.managerRef
      ? { id: identity.managerRef.id, name: identity.managerRef.name }
      : null,
    modified: identity.modified ?? null,
  };
}

export default async function IdentitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    per?: string;
    q?: string;
    profile?: string;
    lcs?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const per = perFromParam(params.per);
  const q = (params.q ?? "").trim();
  const profile = (params.profile ?? "").trim() || null;
  const lcs = lcsFromParam(params.lcs);
  const requestedPage = pageFromParam(params.page);

  const userId = session.user.id;
  const filters = buildFilters({ q, profile, lcs });
  const offset = (requestedPage - 1) * per;

  // Fetch identities + profiles in parallel. Profiles is best-effort:
  // if it 403s, the filter dropdown shows "No profiles available" but
  // the rest of the page still works.
  const [identitiesResult, profilesResult] = await Promise.all([
    listIdentities(userId, {
      limit: Math.min(per, MAX_PER),
      offset,
      filters,
      sorters: "name",
      count: true,
    }),
    listIdentityProfiles(userId).catch(() => ({
      ok: false as const,
      status: 0,
      message: "fetch failed",
    })),
  ]);

  // Hard failure path: the identities call itself failed. 403 renders an
  // explicit "no permission" empty state per the issue acceptance criteria.
  if (!identitiesResult.ok) {
    return (
      <div className="w-full px-6 py-6">
        <PageHeader
          title="Identities"
          description="People on the connected SailPoint tenant — list, filter, and inspect."
        />
        <div className="pt-6">
          {identitiesResult.status === 403 ? (
            <NoPermissionState />
          ) : (
            <SailpointEmptyState
              reason={
                identitiesResult.status === 0
                  ? "not_connected"
                  : identitiesResult.status === 401
                    ? "auth_failed"
                    : "api_error"
              }
              detail={
                identitiesResult.status >= 400
                  ? `${identitiesResult.status} ${identitiesResult.message}`
                  : undefined
              }
            />
          )}
        </div>
      </div>
    );
  }

  const rows = identitiesResult.data.map(toRow);
  const total = identitiesResult.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(requestedPage, totalPages);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + rows.length, total);

  const profiles = profilesResult.ok ? profilesResult.data : [];

  const currentSearchParams = new URLSearchParams();
  if (q) currentSearchParams.set("q", q);
  if (profile) currentSearchParams.set("profile", profile);
  if (lcs) currentSearchParams.set("lcs", lcs);
  if (per !== DEFAULT_PER) currentSearchParams.set("per", String(per));
  if (page > 1) currentSearchParams.set("page", String(page));

  return (
    <div className="w-full px-6 py-6">
      <PageHeader
        title="Identities"
        description="People on the connected SailPoint tenant — list, filter, and inspect."
      />
      <div className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox initial={q} />
          <ProfileFilter
            options={profiles.map((p) => ({ id: p.id, name: p.name }))}
            selected={profile}
          />
          <LcsFilter selected={lcs} />
          {(q || profile || lcs) && (
            <Link
              href="/identities"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-xs text-muted-foreground",
              )}
            >
              Clear filters
            </Link>
          )}
        </div>
        <IdentitiesTable data={rows} />
        <Pagination
          page={page}
          per={per}
          totalPages={totalPages}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          searchParams={currentSearchParams}
        />
      </div>
    </div>
  );
}

function Pagination({
  page,
  per,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  searchParams,
}: {
  page: number;
  per: PerPage;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  searchParams: URLSearchParams;
}) {
  if (total === 0) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const items = pagesToRender(page, totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2",
            )}
          >
            {per} / page
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PAGE_SIZES.map((n) => (
              <DropdownMenuItem key={n} asChild>
                <Link
                  href={buildHref("/identities", searchParams, {
                    per: n === DEFAULT_PER ? null : String(n),
                    page: null,
                  })}
                >
                  {n} / page
                  {n === per && <Check className="ml-auto h-4 w-4" />}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          {prevDisabled ? (
            <Button variant="ghost" size="sm" disabled aria-disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only">Previous</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={buildHref("/identities", searchParams, {
                  page: page - 1 === 1 ? null : String(page - 1),
                })}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="sr-only">Previous</span>
              </Link>
            </Button>
          )}

          <div className="hidden items-center gap-1 sm:flex">
            {items.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  aria-hidden
                  className="px-2 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : item === page ? (
                <span
                  key={item}
                  aria-current="page"
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-sm font-medium text-background"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildHref("/identities", searchParams, {
                    page: item === 1 ? null : String(item),
                  })}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {item}
                </Link>
              ),
            )}
          </div>

          <span className="px-1 text-xs font-medium text-foreground sm:hidden">
            {page} / {totalPages}
          </span>

          {nextDisabled ? (
            <Button variant="ghost" size="sm" disabled aria-disabled>
              <span className="sr-only">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={buildHref("/identities", searchParams, {
                  page: String(page + 1),
                })}
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Explicit "no permission" state for a 403 on `listIdentities`. We don't
 * reuse `SailpointEmptyState` here because the CTA differs — the user is
 * authenticated, they just lack `idn:identity:read`.
 */
function NoPermissionState() {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No permission to view identities</p>
      <p className="mt-2">
        Your SailPoint session is connected, but the API rejected the request
        with <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">403 Forbidden</code>.
        Ask your tenant administrator to grant the <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">idn:identity:read</code> scope
        on your OAuth client, then sign in again.
      </p>
    </div>
  );
}
