import type { AppRole } from "@/lib/types";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Grid3x3,
  Wallet,
  ShieldCheck,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: AppRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["user", "management", "admin"] },
  { label: "Projects", href: "/projects", icon: FolderKanban, roles: ["user", "management", "admin"] },
  { label: "People", href: "/people", icon: Users, roles: ["user", "management", "admin"] },
  { label: "Customers", href: "/customers", icon: Building2, roles: ["user", "management", "admin"] },
  { label: "Skill Matrix", href: "/skill-matrix", icon: Grid3x3, roles: ["user", "management", "admin"] },
  { label: "Budget & Resources", href: "/resources", icon: Wallet, roles: ["management", "admin"] },
];

export const ADMIN_NAV_ITEM: NavItem = {
  label: "Administration",
  href: "/admin",
  icon: ShieldCheck,
  roles: ["admin"],
};

export function canAccess(role: AppRole, item: NavItem): boolean {
  return item.roles.includes(role);
}
