import {
  ArrowDownUp,
  Braces,
  Calendar,
  Database,
  GitBranch,
  Globe,
  Hash,
  Layers,
  Replace,
  ScanLine,
  Sigma,
  Type,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

/**
 * Transform type pill. Per DESIGN.md §2.4, transform types all render
 * with `tone="accent"`. The text label is the distinguishing signal —
 * the prior 8-tone palette was never published and didn't help readers.
 * Revisit after 4 weeks of usage if pain emerges.
 *
 * `<TypeIcon>` is kept as a separate export for compact icon-only
 * contexts (grid card glyph, table row glyph). The icon shape carries
 * meaning; color is intentionally neutral muted.
 */
const TYPE_ICONS: Record<string, LucideIcon> = {
  upper: Zap,
  lower: Zap,
  trim: Zap,
  concat: Layers,
  split: ArrowDownUp,
  substring: Layers,
  replace: Replace,
  replaceAll: Replace,
  accountAttribute: Database,
  identityAttribute: Database,
  reference: GitBranch,
  lookup: Layers,
  static: Sigma,
  firstValid: GitBranch,
  normalizeNames: Wand2,
  decomposeDiacriticalMarks: ScanLine,
  e164phone: Hash,
  iso3166: Globe,
  rfc5646: Globe,
  displayName: Type,
  dateCompare: Calendar,
  dateFormat: Calendar,
  dateMath: Calendar,
  conditional: GitBranch,
  base64Encode: Braces,
  base64Decode: Braces,
};

export function TypePill({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  return (
    <Pill tone="accent" mono shape="square" className={className}>
      {type}
    </Pill>
  );
}

export function TypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = TYPE_ICONS[type] ?? Wand2;
  return (
    <Icon
      aria-hidden
      className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", className)}
    />
  );
}
