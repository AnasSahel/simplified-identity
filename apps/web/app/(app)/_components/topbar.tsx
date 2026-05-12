import Link from "next/link";
import { Bell, CircleHelp } from "lucide-react";

import { Pill } from "@/components/ui/pill";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { Breadcrumbs } from "./breadcrumbs";

export function Topbar({ tenant }: { tenant: string | null }) {
  return (
    <header className="flex h-12 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumbs />
      {tenant && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <Pill tone="success" mono dot>
            {tenant}
          </Pill>
        </>
      )}
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Help"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      <Link
        href="https://developer.sailpoint.com/docs/api/authentication/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Docs
      </Link>
      <button
        type="button"
        aria-label="Notifications"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
