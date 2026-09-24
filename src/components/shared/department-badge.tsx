import type { Department } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEPARTMENT_DOT: Record<Department, string> = {
  "IT Solutions": "bg-info",
  Development: "bg-primary",
  Data: "bg-status-healthy",
  "5G": "bg-status-under",
};

export function DepartmentBadge({ department, className }: { department: Department; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DEPARTMENT_DOT[department])} />
      {department}
    </span>
  );
}
