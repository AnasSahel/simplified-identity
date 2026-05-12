import Link from "next/link";

import { BrandWordmark } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-muted)_0%,_var(--color-background)_60%)]"
      />
      <Link href="/" className="mb-10">
        <BrandWordmark size="md" />
      </Link>
      {children}
      <p className="mt-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Simplified Identity
      </p>
    </div>
  );
}
