/**
 * `<PrincipalCell>` — name + email + optional avatar/badge slots.
 * Used in row cells where a person/entity is the primary subject.
 * See DESIGN.md §2.3.
 */
export function PrincipalCell({
  name,
  email,
  leading,
  trailing,
}: {
  name: string;
  email?: string | null;
  /** Avatar or icon rendered to the left. */
  leading?: React.ReactNode;
  /** Badge or chip rendered next to the name (e.g. EXT). */
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 leading-tight">
      {leading}
      <div className="flex min-w-0 flex-col">
        <span className="inline-flex items-center truncate si-body font-medium">
          {name}
          {trailing}
        </span>
        {email && (
          <span className="truncate si-caption text-muted-foreground">
            {email}
          </span>
        )}
      </div>
    </div>
  );
}
