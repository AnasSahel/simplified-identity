import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-semibold tracking-tight text-primary-foreground",
        className,
      )}
    >
      SI
    </span>
  );
}

export function BrandWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        sizes[size],
        className,
      )}
    >
      <BrandMark />
      <span>
        Simplified <span className="font-normal text-muted-foreground">Identity</span>
      </span>
    </span>
  );
}
