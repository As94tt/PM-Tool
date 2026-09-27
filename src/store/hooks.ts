"use client";

import { useAppStore } from "./app-store-provider";
import { canEditFunction, canView, getPermission, type PermissionLevel } from "@/lib/permissions";

export function useCurrentPerson() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const people = useAppStore((s) => s.people);
  return people.find((p) => p.id === currentUserId) ?? people[0];
}

export function useViewAsRole() {
  return useAppStore((s) => s.viewAsRole);
}

/** This session's permission level for a given app function (see
 * lib/permissions.ts for the function key list), based on the role picked
 * at login. */
export function usePermissionLevel(functionKey: string): PermissionLevel {
  const role = useAppStore((s) => s.viewAsRole);
  const permissions = useAppStore((s) => s.permissions);
  return getPermission(permissions, functionKey, role);
}

export function useCanViewFunction(functionKey: string): boolean {
  const role = useAppStore((s) => s.viewAsRole);
  const permissions = useAppStore((s) => s.permissions);
  return canView(permissions, functionKey, role);
}

export function useCanEditFunction(functionKey: string): boolean {
  const role = useAppStore((s) => s.viewAsRole);
  const permissions = useAppStore((s) => s.permissions);
  return canEditFunction(permissions, functionKey, role);
}
