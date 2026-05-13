import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SourceSchema } from "@/lib/sailpoint/sources-api";

/**
 * Schemas tab — one section per schema (typically `account` + `group`),
 * read-only attribute table. Editing is out of v0 scope: ISC blocks
 * schema mutations on high-volume tenants behind a feature flag (see
 * memory: feedback_isc_schema_attr_mutation_ff).
 */
export function SourceSchemas({ schemas }: { schemas: SourceSchema[] }) {
  if (schemas.length === 0) {
    return (
      <p className="si-caption text-muted-foreground">
        No schemas declared on this source.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {schemas.map((schema) => (
        <SchemaSection key={schema.id} schema={schema} />
      ))}
    </div>
  );
}

function SchemaSection({ schema }: { schema: SourceSchema }) {
  const attrs = schema.attributes ?? [];
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h2 className="si-subtitle font-medium capitalize">{schema.name}</h2>
        {schema.nativeObjectType && (
          <span className="si-caption text-muted-foreground font-mono">
            {schema.nativeObjectType}
          </span>
        )}
        <span className="si-caption text-muted-foreground">
          {attrs.length} {attrs.length === 1 ? "attribute" : "attributes"}
        </span>
      </div>
      {schema.identityAttribute && (
        <p className="si-caption text-muted-foreground">
          Identity attribute:{" "}
          <span className="font-mono">{schema.identityAttribute}</span>
          {schema.displayAttribute &&
            schema.displayAttribute !== schema.identityAttribute && (
              <>
                {" · "}Display attribute:{" "}
                <span className="font-mono">{schema.displayAttribute}</span>
              </>
            )}
        </p>
      )}
      {attrs.length === 0 ? (
        <p className="si-caption text-muted-foreground">
          This schema declares no attributes.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32%]">Name</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-24">Multi</TableHead>
                <TableHead className="w-32">Role</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attrs.map((a) => (
                <TableRow key={a.name}>
                  <TableCell className="si-body font-mono">{a.name}</TableCell>
                  <TableCell className="si-caption text-muted-foreground">
                    {a.type}
                  </TableCell>
                  <TableCell>
                    {a.isMulti ? (
                      <Pill tone="info">multi</Pill>
                    ) : (
                      <span className="si-caption text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {a.isEntitlement && <Pill tone="accent">entitlement</Pill>}
                    {a.isGroup && <Pill tone="accent">group</Pill>}
                    {!a.isEntitlement && !a.isGroup && (
                      <span className="si-caption text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="si-caption text-muted-foreground">
                    {a.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
