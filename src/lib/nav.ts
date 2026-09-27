import type { AppRole } from "@/lib/types";
import { canView, type PermissionMatrix } from "@/lib/permissions";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Grid3x3,
  Wallet,
  ShieldCheck,
  Building2,
  Bug,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Key into the admin-editable permission matrix (see lib/permissions.ts) — visibility and access are driven by that, not a hardcoded role list. */
  functionKey: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, functionKey: "dashboard" },
  { label: "Projects", href: "/projects", icon: FolderKanban, functionKey: "projects" },
  { label: "People", href: "/people", icon: Users, functionKey: "people" },
  { label: "Customers", href: "/customers", icon: Building2, functionKey: "customers" },
  { label: "Skill Matrix", href: "/skill-matrix", icon: Grid3x3, functionKey: "skill-matrix" },
  { label: "Budget & Resources", href: "/resources", icon: Wallet, functionKey: "resources" },
];

export const BUGS_NAV_ITEM: NavItem = {
  label: "Bugs & Requests",
  href: "/feedback",
  icon: Bug,
  functionKey: "feedback",
};

export const ADMIN_NAV_ITEM: NavItem = {
  label: "Administration",
  href: "/admin",
  icon: ShieldCheck,
  functionKey: "admin",
};

export function canAccess(permissions: PermissionMatrix, role: AppRole, item: NavItem): boolean {
  return canView(permissions, item.functionKey, role);
}
