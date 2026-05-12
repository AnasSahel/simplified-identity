import { StateView } from "@/components/ui/state-view";
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
        {status === "coming-soon" ? (
          <StateView
            intent="coming-soon"
            title="Coming soon"
            description="This module is on the roadmap and not yet implemented. We'll ship it as part of an upcoming release."
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
