import Link from "next/link";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { PROJECT_STATUS_BADGE, PROJECT_STATUS_LABEL } from "@/lib/project-status";
import type { Client, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectMiniCard({
  project,
  clients,
  roleOnProject,
  className,
}: {
  project: Project;
  clients: Client[];
  roleOnProject?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-elevation-1 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2",
        className
      )}
    >
      <ProjectAvatar project={project} clients={clients} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{project.name}</p>
        <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
        {roleOnProject && <p className="mt-1 text-xs text-muted-foreground/80">{roleOnProject}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className={cn("font-normal", PROJECT_STATUS_BADGE[project.status])}>
            {PROJECT_STATUS_LABEL[project.status]}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {formatDate(project.startDate)}
            {project.endDate ? ` – ${formatDate(project.endDate)}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
