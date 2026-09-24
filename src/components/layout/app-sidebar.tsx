"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogoMark } from "@/components/shared/logo-mark";
import { NAV_ITEMS, ADMIN_NAV_ITEM, canAccess } from "@/lib/nav";
import { useAppStore } from "@/store/app-store-provider";
import { useCurrentPerson } from "@/store/hooks";
import { fullName, initials } from "@/lib/data/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, UserRound } from "lucide-react";
import type { AppRole } from "@/lib/types";

const ROLE_LABEL: Record<AppRole, string> = {
  user: "User",
  management: "Management",
  admin: "Admin",
};

export function AppSidebar() {
  const pathname = usePathname();
  const role = useAppStore((s) => s.viewAsRole);
  const setViewAsRole = useAppStore((s) => s.setViewAsRole);
  const person = useCurrentPerson();

  const items = NAV_ITEMS.filter((item) => canAccess(role, item));
  const showAdmin = canAccess(role, ADMIN_NAV_ITEM);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent active:bg-transparent"
              render={<Link href="/" />}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground">
                <LogoMark className="size-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-heading text-sm font-semibold tracking-tight">Nexus</span>
                <span className="text-[11px] text-sidebar-foreground/55">Company Platform</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={active} tooltip={item.label} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(ADMIN_NAV_ITEM.href)}
                    tooltip={ADMIN_NAV_ITEM.label}
                    render={<Link href={ADMIN_NAV_ITEM.href} />}
                  >
                    <ADMIN_NAV_ITEM.icon />
                    <span>{ADMIN_NAV_ITEM.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg">
                    <Avatar className="size-6 rounded-lg">
                      <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                      <AvatarFallback className="rounded-lg">{initials(person)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-medium">{fullName(person)}</span>
                      <span className="text-[11px] text-sidebar-foreground/55">{ROLE_LABEL[role]}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserRound className="size-3.5" /> Signed in as
                  </DropdownMenuLabel>
                  <DropdownMenuItem render={<Link href={`/people/${person.id}`} />}>My profile</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={role} onValueChange={(v) => setViewAsRole(v as AppRole)}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Demo: view platform as
                  </DropdownMenuLabel>
                  <DropdownMenuRadioItem value="user">User</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="management">Management</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
