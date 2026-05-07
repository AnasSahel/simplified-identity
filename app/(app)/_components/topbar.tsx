import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { Breadcrumbs } from "./breadcrumbs";
import { TenantPill } from "./tenant-pill";

export function Topbar({ tenant }: { tenant: string | null }) {
  return (
    <header className="flex h-12 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumbs />
      {tenant && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <TenantPill tenant={tenant} />
        </>
      )}
      <div className="flex-1" />
      <Link
        href="https://developer.sailpoint.com/docs/api/authentication/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Docs
      </Link>
    </header>
  );
}
