"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  ChevronRight,
  Database,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { BrandMark, BrandWordmark } from "@/components/brand-mark";
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

export function AppSidebar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const sailpointActive = SAILPOINT.children.some((c) =>
    isActive(pathname, c.href),
  );

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-1.5 transition-opacity hover:opacity-80"
        >
          <BrandWordmark
            size="sm"
            className="group-data-[collapsible=icon]:hidden"
          />
          <BrandMark className="hidden group-data-[collapsible=icon]:inline-flex" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
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
                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link href={child.href}>
                                <ChildIcon />
                                <span>{child.label}</span>
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
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {name ?? "Account"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {email}
            </span>
          </div>
          <UserMenu name={name} email={email} />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
