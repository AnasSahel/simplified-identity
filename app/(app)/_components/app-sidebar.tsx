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

function CountBadge({
  count,
  active,
}: {
  count: number | string;
  active?: boolean;
}) {
  const display = typeof count === "number" ? formatCount(count) : count;
  return (
    <span
      className={`ml-auto pl-2 text-xs tabular-nums ${
        active ? "text-sidebar-foreground/80" : "text-sidebar-foreground/55"
      }`}
    >
      {display}
    </span>
  );
}

function userInitials(name: string | null, email: string) {
  const source = (name ?? email).trim();
  if (!source) return "·";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
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
      <SidebarHeader className="gap-2 pb-1 pt-2">
        <div className="flex items-center justify-between gap-1 px-1">
          <Link
            href="/dashboard"
            className="flex items-center transition-opacity hover:opacity-80 group-data-[collapsible=icon]:hidden"
          >
            <BrandWordmark size="md" />
          </Link>
          <Link
            href="/dashboard"
            className="hidden items-center transition-opacity hover:opacity-80 group-data-[collapsible=icon]:inline-flex"
          >
            <BrandMark size="sm" />
          </Link>
          <button
            type="button"
            aria-label="Settings"
            title="Settings (coming soon)"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <div className="px-1 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              placeholder="Search…"
              aria-label="Search"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 inline-flex h-5 -translate-y-1/2 select-none items-center rounded border border-border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
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
                      className="h-9 px-2"
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                        {count !== undefined && (
                          <CountBadge count={count} active={active} />
                        )}
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
                      className="h-9 px-2"
                    >
                      <SAILPOINT.icon />
                      <span>{SAILPOINT.label}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="gap-0.5">
                      {SAILPOINT.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(pathname, child.href);
                        const count = counts?.[child.href];
                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={active}
                              className="h-8 px-2"
                            >
                              <Link href={child.href}>
                                <ChildIcon />
                                <span>{child.label}</span>
                                {count !== undefined && (
                                  <CountBadge count={count} active={active} />
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
      <SidebarFooter className="border-t pt-2">
        <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-violet-100 text-xs font-medium text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
              {userInitials(name, email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {name ?? "Account"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
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
