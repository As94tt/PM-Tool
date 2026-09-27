import type { AppRole } from "@/lib/types";

/** "hidden" = the function doesn't appear at all; "view" = read-only access;
 * "edit" = can also create/change things in that function. Not every
 * function has a distinct edit-gated action (e.g. Dashboard is read-only
 * regardless), but every function still carries all three levels for a
 * consistent, single admin-editable table. */
export type PermissionLevel = "hidden" | "view" | "edit";

export interface AppFunctionDef {
  key: string;
  label: string;
  description: string;
}

/** One row per major area of the app — kept 1:1 with the sidebar's nav
 * items (see nav.ts) plus Bugs & Requests and Administration, so the
 * permissions table always matches what's actually navigable. */
export const APP_FUNCTIONS: AppFunctionDef[] = [
  { key: "dashboard", label: "Dashboard", description: "Company-wide overview stats" },
  { key: "projects", label: "Projects", description: "Project directory, detail pages and staffing plans" },
  { key: "people", label: "People", description: "People directory and profiles" },
  { key: "customers", label: "Customers", description: "Client directory and detail pages" },
  { key: "skill-matrix", label: "Skill Matrix", description: "Skill discovery and matrix views" },
  { key: "resources", label: "Budget & Resources", description: "Company-wide resource and budget planning" },
  { key: "feedback", label: "Bugs & Requests", description: "The feedback board" },
  { key: "admin", label: "Administration", description: "Master data catalogs, users and permissions" },
];

export type PermissionMatrix = Record<string, Record<AppRole, PermissionLevel>>;

/** Mirrors the app's previous hardcoded role checks exactly, so shipping
 * this as the default doesn't change anyone's access on its own. */
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  dashboard: { user: "view", management: "view", admin: "view" },
  projects: { user: "view", management: "view", admin: "edit" },
  people: { user: "view", management: "view", admin: "edit" },
  customers: { user: "view", management: "view", admin: "edit" },
  "skill-matrix": { user: "view", management: "view", admin: "view" },
  resources: { user: "hidden", management: "edit", admin: "edit" },
  feedback: { user: "edit", management: "edit", admin: "edit" },
  admin: { user: "hidden", management: "hidden", admin: "edit" },
};

export const ROLE_LABEL: Record<AppRole, string> = {
  user: "User",
  management: "Management",
  admin: "Admin",
};

export const PERMISSION_LEVEL_LABEL: Record<PermissionLevel, string> = {
  hidden: "Not visible",
  view: "Can view",
  edit: "Can edit",
};

export function getPermission(matrix: PermissionMatrix, functionKey: string, role: AppRole): PermissionLevel {
  return matrix[functionKey]?.[role] ?? "hidden";
}

export function canView(matrix: PermissionMatrix, functionKey: string, role: AppRole): boolean {
  return getPermission(matrix, functionKey, role) !== "hidden";
}

export function canEditFunction(matrix: PermissionMatrix, functionKey: string, role: AppRole): boolean {
  return getPermission(matrix, functionKey, role) === "edit";
}
