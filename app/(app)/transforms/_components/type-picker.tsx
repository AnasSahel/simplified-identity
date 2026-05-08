"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  TRANSFORM_REGISTRY,
  knownTypes,
} from "@/lib/sailpoint/transforms/registry";
import {
  TRANSFORM_GROUPS,
  type TransformGroupSlug,
} from "@/lib/sailpoint/transform-groups";

import { TypePill } from "../../_components/type-pill";

type Entry = {
  type: string;
  description: string;
  group: TransformGroupSlug;
};

const ENTRIES: Entry[] = knownTypes()
  .map((type) => {
    const spec = TRANSFORM_REGISTRY[type];
    return {
      type,
      description: spec?.description ?? "",
      group: (spec?.group ?? "other") as TransformGroupSlug,
    };
  })
  .sort((a, b) => a.type.localeCompare(b.type));

function groupLabel(slug: TransformGroupSlug): string {
  return TRANSFORM_GROUPS[slug]?.label ?? slug;
}

function filterEntries(entries: Entry[], query: string): Entry[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.type.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      groupLabel(e.group).toLowerCase().includes(q),
  );
}

function groupBy<T>(entries: T[], keyFn: (e: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const e of entries) {
    const k = keyFn(e);
    const list = out.get(k) ?? [];
    list.push(e);
    out.set(k, list);
  }
  return out;
}

type TypePickerProps = {
  value: string | null;
  onChange: (type: string) => void;
  /** Render-style: full button (default) or compact pill-only. */
  variant?: "button" | "compact";
  /** Override the trigger label (defaults to "Type"). */
  label?: string;
};

export function TypePicker({
  value,
  onChange,
  variant = "button",
  label = "Type",
}: TypePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => filterEntries(ENTRIES, query), [query]);
  const grouped = React.useMemo(
    () => groupBy(filtered, (e) => e.group),
    [filtered],
  );

  const known = value !== null && TRANSFORM_REGISTRY[value] !== undefined;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2",
          variant === "compact" && "h-7 px-2",
        )}
      >
        {variant === "button" && (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
        {value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : known ? (
          <TypePill type={value} />
        ) : (
          <span className="font-mono text-xs">
            {value}{" "}
            <span className="text-muted-foreground">(unknown)</span>
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0">
        <div className="relative border-b">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            autoFocus
            placeholder="Search type or group…"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            className="h-9 w-full bg-transparent pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No type matches "{query}".
            </p>
          ) : (
            Array.from(grouped.entries()).map(([group, entries], i) => (
              <React.Fragment key={group}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {groupLabel(group as TransformGroupSlug)}
                </DropdownMenuLabel>
                {entries.map((e) => (
                  <DropdownMenuItem
                    key={e.type}
                    onSelect={() => {
                      onChange(e.type);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2 py-1.5"
                  >
                    <TypePill type={e.type} className="mt-0.5" />
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground line-clamp-2">
                      {e.description}
                    </span>
                    {value === e.type && (
                      <Check className="mt-1 h-3.5 w-3.5 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </React.Fragment>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
