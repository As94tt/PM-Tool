"use client";

import { ShieldAlert } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { canView, canViewAny } from "@/lib/permissions";

export function RoleGate({
  functionKey,
  children,
}: {
  /** A single permission-matrix key, or an array meaning "allow if any of these are viewable" (e.g. Administration's several sub-functions). */
  functionKey: string | string[];
  children: React.ReactNode;
}) {
  const role = useAppStore((s) => s.viewAsRole);
  const permissions = useAppStore((s) => s.permissions);
  const allowed = Array.isArray(functionKey)
    ? canViewAny(permissions, functionKey, role)
    : canView(permissions, functionKey, role);
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <div>
          <p className="font-heading text-lg font-semibold">Restricted area</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This section isn&apos;t available for your current role.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
