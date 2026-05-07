import Link from "next/link";

import { BrandWordmark } from "@/components/brand-mark";
import { UserMenu } from "./user-menu";

export function Topbar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/dashboard"
          className="transition-opacity hover:opacity-80"
        >
          <BrandWordmark size="sm" />
        </Link>
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
