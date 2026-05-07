"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { BrandMark, BrandWordmark } from "@/components/brand-mark";
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
  SidebarRail,
} from "@/components/ui/sidebar";

import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sources", label: "Source health", icon: Activity },
  { href: "/access-requests", label: "Access requests", icon: KeyRound },
  { href: "/identities", label: "Identities", icon: Users },
  { href: "/certifications", label: "Certifications", icon: ShieldCheck },
];

export function AppSidebar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
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
              {NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
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
