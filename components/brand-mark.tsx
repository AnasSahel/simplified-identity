import { Fingerprint } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <Fingerprint className="h-4 w-4" />
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
      Simplified Identity
    </span>
  );
}
