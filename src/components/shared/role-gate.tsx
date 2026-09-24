"use client";

import { ShieldAlert } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import type { AppRole } from "@/lib/types";

export function RoleGate({
  allow,
  children,
}: {
  allow: AppRole[];
  children: React.ReactNode;
}) {
  const role = useAppStore((s) => s.viewAsRole);
  if (!allow.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <div>
          <p className="font-heading text-lg font-semibold">Restricted area</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This section is only available to Management and Admin roles.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
