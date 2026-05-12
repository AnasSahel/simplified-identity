import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "ready" | "coming-soon";

/**
 * Shell for list and dashboard pages. Absorbs the prior `<PageHeader>` +
 * `mx-auto max-w-...` container patterns into a single primitive. Detail
 * pages use `<DetailShell>` (PR-8), not this.
 *
 * See DESIGN.md §2.1.
 */
export function PageShell({
  title,
  description,
  actions,
  status = "ready",
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  status?: Status;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[var(--si-content-max)] px-6 py-5",
        className,
      )}
    >
      <header className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="space-y-1">
          <h1 className="si-title">{title}</h1>
          {description && (
            <p className="si-body text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 md:shrink-0">{actions}</div>
        )}
      </header>
      <div className="pt-5">
        {status === "coming-soon" ? <ComingSoonPlaceholder /> : children}
      </div>
    </div>
  );
}

// Temporary placeholder for `status="coming-soon"`. Replaced by
// `<StateView intent="coming-soon">` in PR-4 per DESIGN.md §4.
function ComingSoonPlaceholder() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"
        aria-hidden
      >
        <Sparkles className="h-5 w-5" />
      </span>
      <h2 className="si-section">Coming soon</h2>
      <p className="si-body text-muted-foreground">
        This module is on the roadmap and not yet implemented. We&apos;ll ship
        it as part of an upcoming release.
      </p>
      <Button variant="outline" size="sm" asChild className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
