import { cn } from "@/lib/utils";

export function SailMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M12 3 L4 18 L20 18 Z" />
        <path d="M12 18 L12 21" />
      </svg>
    </span>
  );
}

export function SailWordmark({
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
      <SailMark />
      SailSimplified
    </span>
  );
}
