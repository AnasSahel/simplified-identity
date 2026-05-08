import { cn } from "@/lib/utils";

const BRAND_SIZES = {
  sm: { box: "h-7 w-7 rounded-md", icon: "h-3.5 w-3.5" },
  md: { box: "h-8 w-8 rounded-md", icon: "h-4 w-4" },
  lg: { box: "h-9 w-9 rounded-[10px]", icon: "h-[18px] w-[18px]" },
} as const;

type BrandSize = keyof typeof BRAND_SIZES;

export function BrandMark({
  className,
  size = "sm",
}: {
  className?: string;
  size?: BrandSize;
}) {
  const s = BRAND_SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-primary text-primary-foreground",
        s.box,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
        className={s.icon}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    </span>
  );
}

const WORDMARK_SIZES = {
  sm: { text: "text-base", mark: "sm" as BrandSize, gap: "gap-2" },
  md: { text: "text-lg", mark: "md" as BrandSize, gap: "gap-2.5" },
  lg: { text: "text-2xl", mark: "lg" as BrandSize, gap: "gap-3" },
} as const;

export function BrandWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: BrandSize;
}) {
  const w = WORDMARK_SIZES[size];
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-tight",
        w.gap,
        w.text,
        className,
      )}
    >
      <BrandMark size={w.mark} />
      <span>
        Simplified{" "}
        <span className="font-normal text-muted-foreground">Identity</span>
      </span>
    </span>
  );
}
