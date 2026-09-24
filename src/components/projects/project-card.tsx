import Link from "next/link";
import { Users } from "lucide-react";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { Client, Project, ProjectStatus, Skill } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: "bg-status-healthy/15 text-status-healthy",
  planned: "bg-status-under/15 text-status-under",
  completed: "bg-secondary text-muted-foreground",
};

export function ProjectCard({
  project,
  clients,
  industryName,
  skills,
  teamSize,
}: {
  project: Project;
  clients: Client[];
  industryName?: string;
  skills: Skill[];
  teamSize: number;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-elevation-1 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ProjectAvatar project={project} clients={clients} />
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-foreground group-hover:text-primary">
              {project.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
          </div>
        </div>
        <Badge variant="secondary" className={cn("shrink-0 font-normal", STATUS_BADGE[project.status])}>
          {project.status}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.shortDescription}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {skills.slice(0, 3).map((s) => (
          <Badge key={s.id} variant="secondary" className="font-normal">
            {s.name}
          </Badge>
        ))}
        {skills.length > 3 && (
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            +{skills.length - 3}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span>{industryName}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {teamSize}
          </span>
          <span>{formatDate(project.startDate)}</span>
        </span>
      </div>
    </Link>
  );
}
