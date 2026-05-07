"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  ChevronRight,
  Database,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { BrandMark, BrandWordmark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { UserMenu } from "./user-menu";

type LeafItem = { href: string; label: string; icon: LucideIcon };
type FoldableItem = {
  label: string;
  icon: LucideIcon;
  children: LeafItem[];
};

const WORKSPACE: LeafItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const SAILPOINT: FoldableItem = {
  label: "SailPoint",
  icon: Anchor,
  children: [
    { href: "/sources", label: "Sources", icon: Database },
    { href: "/identities", label: "Identities", icon: Users },
    { href: "/transforms", label: "Transforms", icon: Wand2 },
    { href: "/access-requests", label: "Access requests", icon: KeyRound },
    { href: "/certifications", label: "Certifications", icon: ShieldCheck },
  ],
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function userInitials(name: string | null, email: string) {
  const source = (name ?? email).trim();
  if (!source) return "·";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function CountBadge({ count }: { count: number | string }) {
  const display = typeof count === "number" ? formatCount(count) : count;
  return (
    <span className="ml-auto font-mono text-[11px] tabular-nums text-sidebar-foreground/60">
      {display}
    </span>
  );
}

export function AppSidebar({
  name,
  email,
  counts,
}: {
  name: string | null;
  email: string;
  counts?: Record<string, number | string | undefined>;
}) {
  const pathname = usePathname();
  const sailpointActive = SAILPOINT.children.some((c) =>
    isActive(pathname, c.href),
  );

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-1 px-2 py-1.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <BrandWordmark
              size="sm"
              className="group-data-[collapsible=icon]:hidden"
            />
            <BrandMark className="hidden group-data-[collapsible=icon]:inline-flex" />
          </Link>
          <button
            type="button"
            aria-label="Settings"
            title="Settings (coming soon)"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              placeholder="Search…"
              aria-label="Search"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <kbd className="pointer-events-none absolute right-1.5 top-1/2 inline-flex h-5 -translate-y-1/2 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                const count = counts?.[item.href];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                        {count !== undefined && <CountBadge count={count} />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <Collapsible
                asChild
                defaultOpen={sailpointActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={SAILPOINT.label}
                      isActive={sailpointActive}
                    >
                      <SAILPOINT.icon />
                      <span>{SAILPOINT.label}</span>
                      <ChevronRight className="ml-auto transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {SAILPOINT.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(pathname, child.href);
                        const count = counts?.[child.href];
                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link href={child.href}>
                                <ChildIcon />
                                <span>{child.label}</span>
                                {count !== undefined && (
                                  <CountBadge count={count} />
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-violet-100 text-[11px] font-medium text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
              {userInitials(name, email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {name ?? "Account"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {email}
            </span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <UserMenu name={name} email={email} />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
