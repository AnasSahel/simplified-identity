import { cn } from "@/lib/utils";

/**
 * @deprecated List/dashboard pages migrated to `<PageShell>` (PR-1).
 * Last remaining consumer: `transforms/[id]/page.tsx` (transform detail).
 * This file is removed in PR-8 when `<DetailShell>` replaces it.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 md:shrink-0">{actions}</div>
      )}
    </div>
  );
}
