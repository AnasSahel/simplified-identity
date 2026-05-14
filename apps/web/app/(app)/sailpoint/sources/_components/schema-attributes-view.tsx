"use client";

import * as React from "react";
import { Check, ChevronDown, Filter, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterBar } from "@/components/ui/filter-bar";
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
import { cn } from "@/lib/utils";

type MultiFilter = "any" | "yes" | "no";

/**
 * Client-side filter view for a single schema's attribute table.
 *
 * The parent (`<SourceSchemas>`) stays a Server Component and hands the
 * full schema down. Filter state (search / type / multi-valued) lives
 * here — schemas are small (≤ ~50 attrs on ISC sources) so all
 * filtering runs synchronously via `useMemo` and stays well under the
 * 50ms acceptance budget. No URL params: filter state is ephemeral and
 * orthogonal to the URL-driven sub-tab (`?tab=schemas&schema=<name>`).
 *
 * Type options are derived from the actual attribute list (deduped and
 * lower-cased). This avoids hard-coding a v2025 enum that may diverge
 * across connectors (e.g. `LONG` on legacy sources) — the dropdown only
 * shows types that are actually present in the current schema.
 */
export function SchemaAttributesView({
  schema,
  showHeading,
}: {
  schema: SourceSchema;
  showHeading: boolean;
}) {
  const attrs = React.useMemo(() => schema.attributes ?? [], [schema.attributes]);
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<string | null>(null);
  const [multi, setMulti] = React.useState<MultiFilter>("any");

  // Reset filter state when the active schema changes (sub-tab switch).
  // Stored as state (not a ref) so the compare-and-setState pattern is
  // legal in render — same shape `<SourceSearchBox>` uses to react to
  // prop changes without an effect.
  const [previousSchemaId, setPreviousSchemaId] = React.useState(schema.id);
  if (previousSchemaId !== schema.id) {
    setPreviousSchemaId(schema.id);
    setQuery("");
    setType(null);
    setMulti("any");
  }

  const typeOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of attrs) {
      const raw = (a.type ?? "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label),
    );
  }, [attrs]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return attrs.filter((a) => {
      if (needle && !a.name.toLowerCase().includes(needle)) return false;
      if (type && (a.type ?? "").toLowerCase() !== type) return false;
      if (multi === "yes" && !a.isMulti) return false;
      if (multi === "no" && a.isMulti) return false;
      return true;
    });
  }, [attrs, query, type, multi]);

  const hasAnyFilter = query !== "" || type !== null || multi !== "any";
  const clearFilters = () => {
    setQuery("");
    setType(null);
    setMulti("any");
  };

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
          {hasAnyFilter
            ? `${filtered.length} of ${attrs.length} ${attrs.length === 1 ? "attribute" : "attributes"}`
            : `${attrs.length} ${attrs.length === 1 ? "attribute" : "attributes"}`}
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
        <>
          <FilterBar
            search={
              <AttributeSearchBox
                value={query}
                onChange={setQuery}
                placeholder="Search attributes…"
              />
            }
            filters={
              <>
                <StateFilterDropdown
                  label="Type"
                  value={type}
                  options={typeOptions}
                  onChange={setType}
                />
                <StateFilterDropdown
                  label="Multi-valued"
                  value={multi === "any" ? null : multi}
                  options={MULTI_OPTIONS}
                  onChange={(v) => setMulti((v as MultiFilter | null) ?? "any")}
                />
              </>
            }
            onClear={hasAnyFilter ? clearFilters : undefined}
          />

          {filtered.length === 0 ? (
            <p className="si-caption text-muted-foreground">
              No attributes match the current filters.
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
                  {filtered.map((a) => (
                    <TableRow key={a.name}>
                      <TableCell className="si-body font-mono">
                        {a.name}
                      </TableCell>
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
                        {a.isEntitlement && (
                          <Pill tone="accent">entitlement</Pill>
                        )}
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
        </>
      )}
    </section>
  );
}

const MULTI_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function AttributeSearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-[16rem] flex-1">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={placeholder}
      />
    </div>
  );
}

/**
 * Client-state variant of `<FilterDropdown>`. The shared primitive in
 * `@/components/ui/filter-dropdown` is URL-driven (`hrefFor`), which is
 * the right default for list pages — but here we want ephemeral
 * client state. Same visual treatment, no URL coupling.
 */
function StateFilterDropdown({
  label,
  value,
  options,
  onChange,
  clearLabel = "Any",
}: {
  label: string;
  value: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (next: string | null) => void;
  clearLabel?: string;
}) {
  const active = value !== null;
  const currentLabel = active
    ? (options.find((o) => o.value === value)?.label ?? value)
    : null;
  const buttonLabel = currentLabel ? `${label}: ${currentLabel}` : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          active && "border-primary/40 bg-primary/5 text-primary",
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        {buttonLabel}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="si-caption text-muted-foreground">
          Filter by {label.toLowerCase()}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange(null)}>
          <span className="flex-1">{clearLabel}</span>
          {!active && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => onChange(o.value)}>
            <span className="flex-1">{o.label}</span>
            {value === o.value && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
