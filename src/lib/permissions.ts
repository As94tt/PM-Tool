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

/** One row per area of the app the table can govern separately. Mostly
 * 1:1 with the sidebar's nav items (see nav.ts) plus Bugs & Requests, but
 * People and Administration are each split further where a single row
 * would hide a real distinction:
 *  - People splits by whose profile it is — "own" (your own page) vs
 *    "other" (browsing the directory / anyone else's page) — since those
 *    have always had different rules (everyone can edit their own
 *    profile regardless of role; editing someone else's is role-gated).
 *  - Administration splits by its own sub-areas, since those are
 *    naturally separate concerns an org might want different roles to
 *    reach independently (e.g. Management curating catalogs, but not
 *    touching Users or Permissions). */
export const APP_FUNCTIONS: AppFunctionDef[] = [
  { key: "dashboard", label: "Dashboard", description: "Company-wide overview stats" },
  { key: "projects", label: "Projects", description: "Project directory, detail pages and staffing plans" },
  { key: "people-own", label: "People — Own Profile", description: "Your own profile page and its details" },
  {
    key: "people-other",
    label: "People — Other Profiles",
    description: "The people directory and everyone else's profiles",
  },
  { key: "customers", label: "Customers", description: "Client directory and detail pages" },
  { key: "skill-matrix", label: "Skill Matrix", description: "Skill discovery and matrix views" },
  { key: "resources", label: "Budget & Resources", description: "Company-wide resource and budget planning" },
  { key: "feedback", label: "Bugs & Requests", description: "The feedback board" },
  {
    key: "admin-master-data",
    label: "Administration — Master Data",
    description: "CSV import and catalogs (skills, interests, certifications, locations, roles)",
  },
  { key: "admin-users", label: "Administration — User Management", description: "Change people's roles" },
  { key: "admin-permissions", label: "Administration — Permissions", description: "Edit this permissions table" },
];

/** The three Administration sub-function keys, grouped for the single
 * "Administration" nav link/RoleGate — it should show if any of them do. */
export const ADMIN_FUNCTION_KEYS = ["admin-master-data", "admin-users", "admin-permissions"];

export type PermissionMatrix = Record<string, Record<AppRole, PermissionLevel>>;

/** Mirrors the app's previous hardcoded role checks exactly, so shipping
 * this as the default doesn't change anyone's access on its own — except
 * "people-own", which is now honestly named for what was already true:
 * everyone could always view/edit their own profile, unconditionally. */
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  dashboard: { user: "view", management: "view", admin: "view" },
  projects: { user: "view", management: "view", admin: "edit" },
  "people-own": { user: "edit", management: "edit", admin: "edit" },
  "people-other": { user: "view", management: "view", admin: "edit" },
  customers: { user: "view", management: "view", admin: "edit" },
  "skill-matrix": { user: "view", management: "view", admin: "view" },
  resources: { user: "hidden", management: "edit", admin: "edit" },
  feedback: { user: "edit", management: "edit", admin: "edit" },
  "admin-master-data": { user: "hidden", management: "hidden", admin: "edit" },
  "admin-users": { user: "hidden", management: "hidden", admin: "edit" },
  "admin-permissions": { user: "hidden", management: "hidden", admin: "edit" },
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

/** True when at least one of several function keys is viewable — used for
 * a nav item (like Administration) that fans out into multiple rows in
 * the table but is still one link in the sidebar. */
export function canViewAny(matrix: PermissionMatrix, functionKeys: string[], role: AppRole): boolean {
  return functionKeys.some((key) => canView(matrix, key, role));
}

export function canEditFunction(matrix: PermissionMatrix, functionKey: string, role: AppRole): boolean {
  return getPermission(matrix, functionKey, role) === "edit";
}
