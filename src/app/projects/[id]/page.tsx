"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarRange, Sparkles, Users, Wallet } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import {
  getProjectMemberDetails,
  getProjectSkillDetails,
  getSimilarProjects,
  getProjectMemberAllocationAverage,
  fullName,
  initials,
} from "@/lib/data/queries";
import { formatDate, formatCompactCurrency } from "@/lib/format";
import { getAllocationStatus, ALLOCATION_STATUS_STYLES } from "@/lib/data/capacity";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectMiniCard } from "@/components/projects/project-mini-card";
import { ProjectFormSheet } from "@/components/projects/project-form-sheet";
import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: "bg-status-healthy/15 text-status-healthy",
  planned: "bg-status-under/15 text-status-under",
  completed: "bg-secondary text-muted-foreground",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const role = useAppStore((s) => s.viewAsRole);
  const projects = useAppStore((s) => s.projects);
  const industries = useAppStore((s) => s.industries);
  const skills = useAppStore((s) => s.skills);
  const people = useAppStore((s) => s.people);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const projectSkills = useAppStore((s) => s.projectSkills);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const budgetPlans = useAppStore((s) => s.budgetPlans);
  const clients = useAppStore((s) => s.clients);

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="font-heading text-lg font-semibold">Project not found</p>
        <Link href="/projects" className="text-sm text-primary hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  const industry = industries.find((i) => i.id === project.industryId);
  const members = getProjectMemberDetails(projectMembers, people, project.id);
  const lead = people.find((p) => p.id === project.leadPersonId);
  const techSkills = getProjectSkillDetails(projectSkills, skills, project.id);
  const similar = getSimilarProjects(projects, projectSkills, project.id, 3);
  const budgetPlan = budgetPlans.find((b) => b.projectId === project.id);
  const canSeeBudget = role === "management" || role === "admin";
  const canEdit = role === "admin";

  return (
    <div className="flex flex-col gap-6 pb-8">
      <Link href="/projects" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Projects
      </Link>

      <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 shadow-elevation-1 sm:flex-row sm:items-center">
        <ProjectAvatar project={project} clients={clients} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="secondary" className={STATUS_BADGE[project.status]}>
              {project.status}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{project.clientName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-3.5" /> {industry?.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="size-3.5" />
              {formatDate(project.startDate)}
              {project.endDate ? ` – ${formatDate(project.endDate)}` : " – ongoing"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> {project.projectType}
            </span>
          </div>
        </div>
        {canEdit && <ProjectFormSheet project={project} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6 shadow-elevation-1">
            <h2 className="font-heading text-base font-semibold">Overview</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{project.shortDescription}</p>

            {project.outcomes.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Relevant experience & key outcomes
                </p>
                <ul className="flex flex-col gap-2">
                  {project.outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {techSkills.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Skills & technologies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {techSkills.map((s) => (
                    <Badge key={s.id} variant="secondary" className="font-normal">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-elevation-1">
            <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold">
              <Users className="size-4" /> Team & resource allocation
            </h2>
            <div className="mt-4 flex flex-col divide-y divide-border/70">
              {members.map(({ person, roleOnProject }) => {
                const avg = getProjectMemberAllocationAverage(resourceAllocations, project.id, person.id);
                const statusStyles = ALLOCATION_STATUS_STYLES[getAllocationStatus(avg)];
                return (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-secondary/50"
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                      <AvatarFallback>{initials(person)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{fullName(person)}</p>
                      <p className="truncate text-xs text-muted-foreground">{roleOnProject}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", statusStyles.dot)} />
                      ~{avg}% allocated
                    </span>
                  </Link>
                );
              })}
              {members.length === 0 && <p className="py-3 text-sm text-muted-foreground">No team members yet.</p>}
            </div>
          </Card>

          {similar.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-base font-semibold">Similar projects</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {similar.map((p) => (
                  <ProjectMiniCard key={p.id} project={p} clients={clients} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5 shadow-elevation-1">
            <h2 className="font-heading text-sm font-semibold">Project lead</h2>
            {lead && (
              <Link href={`/people/${lead.id}`} className="mt-3 flex items-center gap-3 hover:opacity-80">
                <Avatar className="size-10">
                  <AvatarImage src={lead.avatarUrl} alt={fullName(lead)} />
                  <AvatarFallback>{initials(lead)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{fullName(lead)}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead.jobTitle}</p>
                </div>
              </Link>
            )}
          </Card>

          <Card className="p-5 shadow-elevation-1">
            <h2 className="font-heading text-sm font-semibold">Client</h2>
            <p className="mt-2 text-sm text-muted-foreground">{project.clientName}</p>
            <p className="text-sm text-muted-foreground">{industry?.name}</p>
          </Card>

          {canSeeBudget && (
            <Card className="p-5 shadow-elevation-1">
              <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
                <Wallet className="size-4" /> Budget
              </h2>
              <p className="mt-3 font-heading text-2xl font-semibold">{formatCompactCurrency(project.totalBudget)}</p>
              <p className="text-xs text-muted-foreground">Total budget</p>
              {budgetPlan && (
                <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                  Planned personnel cost:{" "}
                  <span className="font-medium text-foreground">
                    {formatCompactCurrency(budgetPlan.plannedPersonnelCost)}
                  </span>
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
