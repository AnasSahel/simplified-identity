"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { AttrSchema } from "@/lib/sailpoint/transforms/catalog";

export type AttrControlProps = {
  schema: AttrSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  tenantTransforms: ReadonlyArray<{ id: string; name: string; type: string }>;
  tenantSources: ReadonlyArray<{ id: string; name: string }>;
};

/** Generic attr control dispatcher (covers text / bool / number / selects / kv). */
export function ScalarAttr({
  schema,
  value,
  onChange,
  tenantSources,
  tenantTransforms,
}: AttrControlProps) {
  switch (schema.t) {
    case "bool":
      return <BoolControl schema={schema} value={value} onChange={onChange} />;
    case "number":
      return (
        <NumberControl schema={schema} value={value} onChange={onChange} />
      );
    case "select":
      return (
        <SelectControl schema={schema} value={value} onChange={onChange} />
      );
    case "select-source":
      return (
        <SelectSourceControl
          schema={schema}
          value={value}
          onChange={onChange}
          sources={tenantSources}
        />
      );
    case "select-transform":
      return (
        <SelectTransformControl
          schema={schema}
          value={value}
          onChange={onChange}
          transforms={tenantTransforms}
        />
      );
    case "kv":
      return <KvControl schema={schema} value={value} onChange={onChange} />;
    case "text":
    default:
      return <TextControl schema={schema} value={value} onChange={onChange} />;
  }
}

// ── Primitives ────────────────────────────────────────────────────────

function TextControl({
  schema,
  value,
  onChange,
}: Pick<AttrControlProps, "schema" | "value" | "onChange">) {
  const v = typeof value === "string" ? value : value === undefined ? "" : String(value);
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={schema.placeholder ?? schema.hint}
      className="h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      spellCheck={false}
    />
  );
}

function NumberControl({
  schema,
  value,
  onChange,
}: Pick<AttrControlProps, "schema" | "value" | "onChange">) {
  const v =
    typeof value === "number"
      ? value
      : typeof value === "string" && value !== ""
        ? Number(value)
        : (schema.default as number | undefined) ?? "";
  return (
    <input
      type="number"
      value={v === "" ? "" : v}
      onChange={(e) => {
        const raw = e.currentTarget.value;
        onChange(raw === "" ? null : Number(raw));
      }}
      placeholder={schema.placeholder ?? schema.hint}
      className="h-8 w-32 rounded-md border border-input bg-background px-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

function BoolControl({
  schema,
  value,
  onChange,
}: Pick<AttrControlProps, "schema" | "value" | "onChange">) {
  const checked = !!value;
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded border-input"
      />
      <span className="text-muted-foreground">
        {checked ? "true" : "false"}
        {schema.default !== undefined && checked === schema.default && (
          <span className="ml-1 text-[10px] opacity-60">(default)</span>
        )}
      </span>
    </label>
  );
}

function SelectControl({
  schema,
  value,
  onChange,
}: Pick<AttrControlProps, "schema" | "value" | "onChange">) {
  const options = schema.options ?? [];
  const current = typeof value === "string" ? value : (schema.default as string | undefined) ?? options[0] ?? "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 gap-1.5 font-mono",
        )}
      >
        {current || "—"}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onSelect={() => onChange(opt)}
            className="font-mono text-xs"
          >
            {opt}
            {current === opt && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SelectSourceControl({
  value,
  onChange,
  sources,
}: Pick<AttrControlProps, "value" | "onChange"> & {
  schema: AttrSchema;
  sources: ReadonlyArray<{ id: string; name: string }>;
}) {
  const current = typeof value === "string" ? value : "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 gap-1.5 font-mono",
        )}
      >
        {current || "Pick a source"}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {sources.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            No sources loaded
          </DropdownMenuItem>
        ) : (
          sources.map((s) => (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => onChange(s.name)}
              className="font-mono text-xs"
            >
              {s.name}
              {current === s.name && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SelectTransformControl({
  value,
  onChange,
  transforms,
}: Pick<AttrControlProps, "value" | "onChange"> & {
  schema: AttrSchema;
  transforms: ReadonlyArray<{ id: string; name: string; type: string }>;
}) {
  const current = typeof value === "string" ? value : "";
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? transforms.filter((t) => t.name.toLowerCase().includes(q))
      : transforms;
  }, [query, transforms]);
  return (
    <DropdownMenu
      onOpenChange={(o) => {
        if (!o) setQuery("");
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 gap-1.5 font-mono",
        )}
      >
        {current || "Pick a transform"}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-0">
        <input
          type="search"
          autoFocus
          placeholder="Search transform…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          className="h-9 w-full border-b bg-transparent px-3 text-sm focus-visible:outline-none"
        />
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              No match
            </p>
          ) : (
            filtered.slice(0, 200).map((t) => (
              <DropdownMenuItem
                key={t.id}
                onSelect={() => onChange(t.name)}
                className="font-mono text-xs"
              >
                <span className="flex-1 truncate">{t.name}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {t.type}
                </span>
                {current === t.name && (
                  <Check className="ml-2 h-3.5 w-3.5 shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Key/Value table ──────────────────────────────────────────────────

function KvControl({
  value,
  onChange,
}: Pick<AttrControlProps, "schema" | "value" | "onChange">) {
  const obj = typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};
  const entries = Object.entries(obj);

  function setKv(next: Record<string, string>) {
    onChange(next);
  }

  return (
    <div className="space-y-1">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="text"
            value={k}
            onChange={(e) => {
              const newKey = e.currentTarget.value;
              const next: Record<string, string> = {};
              for (const [kk, vv] of entries) {
                next[kk === k ? newKey : kk] = vv;
              }
              setKv(next);
            }}
            placeholder="key"
            className="h-7 w-32 rounded border border-input bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="text"
            value={v}
            onChange={(e) => {
              const next = { ...obj, [k]: e.currentTarget.value };
              setKv(next);
            }}
            placeholder="value"
            className="h-7 flex-1 rounded border border-input bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => {
              const next = { ...obj };
              delete next[k];
              setKv(next);
            }}
            className="h-7 w-7 rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Remove ${k}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const next = { ...obj, "": "" };
          setKv(next);
        }}
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        + Add row
      </button>
    </div>
  );
}
