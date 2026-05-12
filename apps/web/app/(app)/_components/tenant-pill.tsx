export function TenantPill({ tenant }: { tenant: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
        aria-hidden
      />
      <span className="font-mono">{tenant}</span>
    </span>
  );
}
