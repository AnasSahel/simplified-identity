import { Tabs } from "@/components/ui/tabs";
import type { SourceSchema } from "@/lib/sailpoint/sources-api";

import { SchemaAttributesView } from "./schema-attributes-view";
import { SchemaTabActions } from "./schema-tab-actions";

/**
 * Schemas tab — sub-tabs (one per schema, typically `account` + `group`)
 * at the top, then the attribute table for the active schema. Editing is
 * out of v0 scope: ISC blocks schema mutations on high-volume tenants
 * behind a feature flag (see memory: feedback_isc_schema_attr_mutation_ff).
 *
 * The sub-tab state is driven from the URL (`?schema=<name>`) so this
 * component stays a Server Component and the selection is deep-linkable.
 * If the source declares only one schema (common on CSV sources), the
 * sub-tabs bar is omitted entirely.
 *
 * Per-schema attribute filtering (search / type / multi-valued) is
 * orthogonal to the URL: it lives in `<SchemaAttributesView>`, a small
 * client component, with ephemeral state. Schemas are small (≤ ~50
 * attrs) so a full-list `useMemo` filter is well within budget.
 *
 * Tab-level actions (Export JSON / Refresh from source — issue #266) sit
 * on the same row as the sub-tabs; they operate on the active schema's
 * payload, NOT on the per-attribute filter inside `<SchemaAttributesView>`
 * (that's a separate concern owned by #281).
 */
export function SourceSchemas({
  sourceId,
  schemas,
  activeSchema,
  hrefForSchema,
}: {
  sourceId: string;
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        {schemas.length > 1 ? (
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
        ) : (
          <span aria-hidden />
        )}
        <SchemaTabActions sourceId={sourceId} activeSchema={active} />
      </div>
      <SchemaAttributesView
        schema={active}
        showHeading={schemas.length === 1}
      />
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}
