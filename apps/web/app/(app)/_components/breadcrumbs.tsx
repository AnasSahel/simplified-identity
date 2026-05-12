"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const SAILPOINT_ROUTES = new Set([
  "sources",
  "identities",
  "transforms",
  "access-requests",
  "certifications",
]);

const LABELS: Record<string, string> = {
  sources: "Sources",
  identities: "Identities",
  transforms: "Transforms",
  "access-requests": "Access requests",
  certifications: "Certifications",
  dashboard: "Dashboard",
};

type Crumb = { label: string; href?: string };

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];
  const first = segments[0];

  if (first === "dashboard") {
    return [{ label: "Dashboard" }];
  }

  if (SAILPOINT_ROUTES.has(first)) {
    const moduleLabel = LABELS[first] ?? first;
    const moduleHref = `/${first}`;
    const crumbs: Crumb[] = [
      { label: "SailPoint" },
      { label: moduleLabel, href: segments.length > 1 ? moduleHref : undefined },
    ];
    if (segments.length > 1) {
      crumbs.push({ label: segments.slice(1).join("/") });
    }
    return crumbs;
  }

  return [{ label: LABELS[first] ?? first }];
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast && "font-medium text-foreground",
                )}
              >
                {c.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
            )}
          </span>
        );
      })}
    </nav>
  );
}
