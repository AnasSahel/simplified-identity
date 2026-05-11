"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Database,
  Edit3,
  GitBranch,
  IdCard,
  Lock,
  Play,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { groupFor } from "@/lib/sailpoint/transform-groups";
import {
  collectRequiredInputs,
  evaluateTransform,
  type EvalResult,
  type RequiredSimulationInput,
} from "@/lib/sailpoint/transform-evaluator";
import { sampleFor } from "@/lib/sailpoint/transform-samples";
import type { UsageEntry } from "@/lib/sailpoint/usages";

import { TypePill } from "../../_components/type-pill";
import { JsonPanel } from "./json-panel";
import { RecipeTree } from "./recipe-tree";
import type { SelectableTransform } from "./types";

type Tab = "configuration" | "usage" | "test" | "json" | "tree";

export function TransformDrawer({
  transforms,
  usagesByName,
  usagesAvailable,
}: {
  transforms: ReadonlyArray<SelectableTransform>;
  usagesByName: ReadonlyMap<string, UsageEntry[]>;
  usagesAvailable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");
  const [tab, setTab] = React.useState<Tab>("configuration");

  // Reset tab when switching between transforms.
  React.useEffect(() => {
    setTab("configuration");
  }, [selectedId]);

  const open = !!selectedId;
  const transform = selectedId
    ? transforms.find((t) => t.id === selectedId)
    : undefined;

  // Lookup table for the local evaluator's `reference` resolution.
  // Memoized so React.useState in TestTab keeps a stable identity across
  // unrelated re-renders.
  const transformsByName = React.useMemo(() => {
    const m = new Map<string, SelectableTransform>();
    for (const t of transforms) m.set(t.name, t);
    return m;
  }, [transforms]);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Drawer is empty when ?selected=... points at an id we don't have.
  // Render the Sheet anyway so the close transition runs cleanly.
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <SheetContent
        side="right"
        hideClose
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetTitle className="sr-only">
          {transform ? transform.name : "Transform details"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {transform
            ? `Transform of type ${transform.type}, ${
                transform.internal ? "built-in" : "custom"
              }`
            : "No transform selected."}
        </SheetDescription>
        {transform ? (
          <DrawerBody
            transform={transform}
            usages={usagesByName.get(transform.name) ?? []}
            usagesAvailable={usagesAvailable}
            transformsByName={transformsByName}
            tab={tab}
            onTabChange={setTab}
            onClose={close}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Transform not found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  transform,
  usages,
  usagesAvailable,
  transformsByName,
  tab,
  onTabChange,
  onClose,
}: {
  transform: SelectableTransform;
  usages: ReadonlyArray<UsageEntry>;
  usagesAvailable: boolean;
  transformsByName: ReadonlyMap<string, SelectableTransform>;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onClose: () => void;
}) {
  const group = groupFor(transform.type);
  const isBuiltin = !!transform.internal;
  const usageCount = usages.length;

  // The JSON we render mirrors the SailPoint API response shape so users
  // can copy it straight into a workflow / TF resource.
  const jsonPayload = {
    name: transform.name,
    type: transform.type,
    attributes: transform.attributes ?? {},
    internal: !!transform.internal,
  };
  const jsonString = JSON.stringify(jsonPayload, null, 2);

  return (
    <>
      <header className="flex flex-col gap-1.5 border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-base font-semibold">
              {transform.name}
            </span>
            <TypePill type={transform.type} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <EditButton id={transform.id} disabled={isBuiltin} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{group.label}</span>
          <span aria-hidden>·</span>
          <span>
            {usagesAvailable
              ? `${usageCount} ${usageCount === 1 ? "usage" : "usages"}`
              : "Usages unavailable"}
          </span>
          <span aria-hidden>·</span>
          {isBuiltin ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              Built-in
            </span>
          ) : (
            <span className="font-medium text-foreground">Custom</span>
          )}
        </div>
      </header>

      <nav className="flex gap-4 border-b px-5">
        <DrawerTab
          active={tab === "configuration"}
          onClick={() => onTabChange("configuration")}
        >
          Configuration
        </DrawerTab>
        <DrawerTab
          active={tab === "usage"}
          onClick={() => onTabChange("usage")}
        >
          Usage
          {usagesAvailable && usageCount > 0 && (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {usageCount}
            </span>
          )}
        </DrawerTab>
        <DrawerTab active={tab === "test"} onClick={() => onTabChange("test")}>
          Test
        </DrawerTab>
        <DrawerTab active={tab === "json"} onClick={() => onTabChange("json")}>
          JSON
        </DrawerTab>
        <DrawerTab active={tab === "tree"} onClick={() => onTabChange("tree")}>
          Tree
        </DrawerTab>
      </nav>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === "configuration" && (
          <ConfigurationTab
            transform={transform}
            isBuiltin={isBuiltin}
          />
        )}
        {tab === "usage" && (
          <UsageTab
            usages={usages}
            usagesAvailable={usagesAvailable}
          />
        )}
        {tab === "test" && (
          <TestTab
            transform={transform}
            transformsByName={transformsByName}
          />
        )}
        {tab === "json" && <JsonPanel value={jsonString} />}
        {tab === "tree" && (
          <RecipeTree
            node={{
              type: transform.type,
              attributes: transform.attributes ?? {},
            }}
            transformsByName={transformsByName}
            onSelectReference={(targetId) => {
              const params = new URLSearchParams(
                window.location.search,
              );
              params.set("selected", targetId);
              const url = `${window.location.pathname}?${params.toString()}`;
              // Use history.replaceState so the drawer body swaps in
              // place — the parent's useSearchParams picks it up via
              // the existing TransformDrawer effect.
              window.history.replaceState(null, "", url);
              // Force a microtask render via custom event so
              // useSearchParams notices.
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            caption="The transform recipe, simplified."
          />
        )}
      </div>
    </>
  );
}

function DrawerTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 text-xs font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "-mb-px inline-flex items-center gap-1 border-b-2 pb-2",
          active ? "border-foreground" : "border-transparent",
        )}
      >
        {children}
      </span>
    </button>
  );
}

function EditButton({ id, disabled }: { id: string; disabled: boolean }) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title="Built-in transforms are read-only"
        className="inline-flex h-7 cursor-not-allowed items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground/70"
      >
        <Lock className="h-3 w-3" />
        Edit
      </button>
    );
  }
  return (
    <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2.5">
      <Link href={`/transforms/${encodeURIComponent(id)}/edit`}>
        <Edit3 className="h-3 w-3" />
        Edit
      </Link>
    </Button>
  );
}

function ConfigurationTab({
  transform,
  isBuiltin,
}: {
  transform: SelectableTransform;
  isBuiltin: boolean;
}) {
  const group = groupFor(transform.type);

  return (
    <div className="space-y-5">
      <section>
        <h3 className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Overview
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Type">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {transform.type}
            </code>
          </Row>
          <Row label="Group">{group.label}</Row>
          <Row label="Internal">{isBuiltin ? "Yes (built-in)" : "No"}</Row>
        </dl>
      </section>
      <p className="text-[11px] text-muted-foreground">
        See the <span className="font-medium">JSON</span> tab for the full
        definition, or the <span className="font-medium">Tree</span> tab
        for a visual breakdown of the recipe.
      </p>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function UsageTab({
  usages,
  usagesAvailable,
}: {
  usages: ReadonlyArray<UsageEntry>;
  usagesAvailable: boolean;
}) {
  if (!usagesAvailable) {
    return (
      <p className="text-sm text-muted-foreground">
        Usage data is unavailable for this session — the SailPoint API call
        timed out or was denied.
      </p>
    );
  }
  if (usages.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
        <p className="text-sm font-medium">No references</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No identity profile, source policy, or other transform references
          this transform. Likely safe to archive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {usages.length}{" "}
        {usages.length === 1 ? "reference" : "references"}
      </p>
      <ul className="space-y-2">
        {usages.map((u, idx) => (
          <UsageRow key={idx} entry={u} />
        ))}
      </ul>
    </div>
  );
}

function UsageRow({ entry }: { entry: UsageEntry }) {
  const Icon =
    entry.kind === "identity-profile"
      ? Users
      : entry.kind === "source-policy"
        ? Database
        : GitBranch;
  return (
    <li className="flex items-center gap-3 rounded-md border bg-card p-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.containerName}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          <ArrowRight className="-mt-0.5 mr-1 inline h-3 w-3" aria-hidden />
          {entry.attributePath}
        </p>
      </div>
    </li>
  );
}

function TestTab({
  transform,
  transformsByName,
}: {
  transform: SelectableTransform;
  transformsByName: ReadonlyMap<string, SelectableTransform>;
}) {
  const [input, setInput] = React.useState<string>(() => sampleFor(transform.type));
  const [simulatedValues, setSimulatedValues] = React.useState<
    Record<string, string>
  >({});
  const [result, setResult] = React.useState<EvalResult | null>(null);

  // The required-context list depends only on the transform's structure;
  // recompute when either the active transform or the loaded transforms map
  // changes (the latter matters for `reference` resolution).
  const requiredInputs = React.useMemo<RequiredSimulationInput[]>(
    () => collectRequiredInputs(transform, transformsByName),
    [transform, transformsByName],
  );

  // Reset state when the user navigates to a different transform.
  React.useEffect(() => {
    setInput(sampleFor(transform.type));
    setSimulatedValues({});
    setResult(null);
  }, [transform.id, transform.type]);

  function run() {
    const r = evaluateTransform(
      {
        id: transform.id,
        name: transform.name,
        type: transform.type,
        attributes: transform.attributes,
      },
      input,
      { transformsByName, simulatedValues },
    );
    setResult(r);
  }

  function loadSample() {
    setInput(sampleFor(transform.type));
    setResult(null);
  }

  function setSimulated(id: string, value: string) {
    setSimulatedValues((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        Local evaluator — runs the transform in your browser, not on
        SailPoint. Context-dependent attributes are surfaced below for you
        to simulate.
      </div>

      <section>
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Input value
          </h3>
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex h-6 items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles className="h-3 w-3" />
            Use sample
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Type or paste an input value…"
          spellCheck={false}
        />
      </section>

      {requiredInputs.length > 0 && (
        <SimulatedContextSection
          inputs={requiredInputs}
          values={simulatedValues}
          onChange={setSimulated}
        />
      )}

      <div>
        <Button type="button" size="sm" onClick={run} className="gap-1.5">
          <Play className="h-3 w-3" />
          Run
        </Button>
      </div>

      <section>
        <h3 className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Output
        </h3>
        <OutputPanel result={result} />
      </section>

      <ComingSoonRealIdentity />
    </div>
  );
}

function SimulatedContextSection({
  inputs,
  values,
  onChange,
}: {
  inputs: ReadonlyArray<RequiredSimulationInput>;
  values: Readonly<Record<string, string>>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <section className="space-y-2 rounded-md border bg-muted/30 px-3 py-3">
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Simulated context
        </h3>
        <p className="pt-0.5 text-[11px] text-muted-foreground">
          This transform reads attributes from the SailPoint runtime
          (identity / account). Provide values to evaluate locally.
        </p>
      </div>
      <div className="space-y-1.5">
        {inputs.map((i) => (
          <div key={i.id} className="grid grid-cols-[1fr_2fr] gap-2 items-baseline">
            <div className="min-w-0">
              <span className="block truncate font-mono text-xs font-medium">
                {i.label}
              </span>
              {i.hint && (
                <span className="block truncate text-[10px] text-muted-foreground">
                  {i.hint}
                </span>
              )}
            </div>
            <input
              type="text"
              value={values[i.id] ?? ""}
              onChange={(e) => onChange(i.id, e.currentTarget.value)}
              className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="(empty)"
              spellCheck={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ComingSoonRealIdentity() {
  return (
    <section className="rounded-md border border-dashed border-violet-300 bg-violet-50/60 px-3 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
      <div className="flex items-start gap-2">
        <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" />
        <div className="flex-1 text-xs">
          <p className="font-medium text-violet-900 dark:text-violet-100">
            Test against a real identity
            <span className="ml-2 rounded bg-violet-200/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">
              Coming soon
            </span>
          </p>
          <p className="mt-1 text-violet-800/80 dark:text-violet-200/70">
            Pick an identity from the tenant and we'll auto-fill the
            simulated context from its attributes and connected accounts.
          </p>
        </div>
      </div>
    </section>
  );
}

function OutputPanel({ result }: { result: EvalResult | null }) {
  if (result === null) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        Click <span className="font-medium">Run</span> to evaluate the
        transform.
      </div>
    );
  }

  if (result.ok) {
    const isEmpty = result.output === "";
    return (
      <pre
        className={cn(
          "overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed",
          isEmpty
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
            : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200",
        )}
      >
        {isEmpty ? "(empty string)" : result.output}
      </pre>
    );
  }

  if (result.unsupported) {
    return (
      <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-3 text-xs text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
        <p className="font-medium">Not testable locally</p>
        <p className="mt-1">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
      <p className="font-medium">Error</p>
      <p className="mt-1 font-mono">{result.error}</p>
    </div>
  );
}
