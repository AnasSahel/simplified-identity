import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import type { SourceSchema } from "@/lib/sailpoint/sources-api";

/**
 * Schemas tab — sub-tabs (one per schema, typically `account` + `group`)
 * at the top, then the attribute table for the active schema. Editing is
 * out of v0 scope: ISC blocks schema mutations on high-volume tenants
 * behind a feature flag (see memory: feedback_isc_schema_attr_mutation_ff).
 *
 * The sub-tab state is driven from the URL (`?schema=<name>`) so the
 * component stays a Server Component and the selection is deep-linkable.
 * If the source declares only one schema (common on CSV sources), the
 * sub-tabs bar is omitted entirely.
 */
export function SourceSchemas({
  schemas,
  activeSchema,
  hrefForSchema,
}: {
  schemas: SourceSchema[];
  /**
   * Lowercased name of the active schema (e.g. `"account"`). If the value
   * doesn't match any schema, the first schema is rendered.
   */
  activeSchema: string;
  /**
   * Builds the URL for switching to the schema with the given name.
   * Receives the lowercased schema name.
   */
  hrefForSchema: (schemaName: string) => string;
}) {
  if (schemas.length === 0) {
    return (
      <p className="si-caption text-muted-foreground">
        No schemas declared on this source.
      </p>
    );
  }

  const active =
    schemas.find((s) => s.name.toLowerCase() === activeSchema) ?? schemas[0];

  return (
    <div className="space-y-4">
      {schemas.length > 1 && (
        <Tabs
          size="sm"
          value={active.name.toLowerCase()}
          hrefFor={(k) => hrefForSchema(k)}
          aria-label="Schemas"
          items={schemas.map((s) => ({
            key: s.name.toLowerCase(),
            label: capitalize(s.name),
            count: s.attributes?.length ?? 0,
          }))}
        />
      )}
      <SchemaSection schema={active} showHeading={schemas.length === 1} />
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function SchemaSection({
  schema,
  showHeading,
}: {
  schema: SourceSchema;
  showHeading: boolean;
}) {
  const attrs = schema.attributes ?? [];
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        {showHeading && (
          <h2 className="si-subtitle font-medium capitalize">{schema.name}</h2>
        )}
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
