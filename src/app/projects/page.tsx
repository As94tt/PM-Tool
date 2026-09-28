"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X, FolderKanban, LayoutGrid, Rows3 } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { useCanEditFunction } from "@/store/hooks";
import { RoleGate } from "@/components/shared/role-gate";
import { filterProjects, getProjectSkillDetails, getProjectMemberDetails, type ProjectFilters } from "@/lib/data/queries";
import { selectLabel } from "@/lib/select-utils";
import { formatDate } from "@/lib/format";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormSheet } from "@/components/projects/project-form-sheet";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROJECT_STATUS_BADGE, PROJECT_STATUS_LABEL, PROJECT_STATUS_OPTIONS } from "@/lib/project-status";
import type { ProjectStatus } from "@/lib/types";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const searchParams = useSearchParams();
  const canEdit = useCanEditFunction("projects");
  const projects = useAppStore((s) => s.projects);
  const projectSkills = useAppStore((s) => s.projectSkills);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const industries = useAppStore((s) => s.industries);
  const skills = useAppStore((s) => s.skills);
  const people = useAppStore((s) => s.people);
  const clients = useAppStore((s) => s.clients);

  const [view, setView] = useState<"cards" | "table">("cards");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "");
  const [industryId, setIndustryId] = useState(searchParams.get("industry") ?? "");
  const [skillId, setSkillId] = useState(searchParams.get("skill") ?? "");
  const [clientName] = useState(searchParams.get("client") ?? "");

  const filters: ProjectFilters = {
    query: query || undefined,
    status: (status || undefined) as ProjectStatus | undefined,
    industryId: industryId || undefined,
    skillId: skillId || undefined,
    clientName: clientName || undefined,
  };

  const results = useMemo(
    () => filterProjects({ projects, projectSkills, filters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, projectSkills, query, status, industryId, skillId, clientName]
  );

  const hasActiveFilters = Boolean(query || status || industryId || skillId || clientName);

  const statusOptions = [{ value: "any", label: "All statuses" }, ...PROJECT_STATUS_OPTIONS];
  const industryOptions = [{ value: "any", label: "All industries" }, ...industries.map((i) => ({ value: i.id, label: i.name }))];
  const skillOptions = [{ value: "any", label: "Any skill" }, ...skills.map((s) => ({ value: s.id, label: s.name }))];

  return (
    <RoleGate functionKey="projects">
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse project experience and reference engagements — not a task tracker.
          </p>
        </div>
        {canEdit && <ProjectFormSheet />}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, client or description…"
            className="pl-9"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={status || "any"} onValueChange={(v) => setStatus(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue>{selectLabel(statusOptions, "Status")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={industryId || "any"} onValueChange={(v) => setIndustryId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue>{selectLabel(industryOptions, "Industry")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {industryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={skillId || "any"} onValueChange={(v) => setSkillId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue>{selectLabel(skillOptions, "Skill")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {skillOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {clientName && (
            <Badge variant="secondary" className="font-normal">
              Client: {clientName}
            </Badge>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setQuery("");
                setStatus("");
                setIndustryId("");
                setSkillId("");
              }}
            >
              <X /> Clear filters
            </Button>
          )}

          <Tabs value={view} onValueChange={(v) => v && setView(v as "cards" | "table")} className="ml-auto">
            <TabsList>
              <TabsTrigger value="cards">
                <LayoutGrid className="size-3.5" /> Cards
              </TabsTrigger>
              <TabsTrigger value="table">
                <Rows3 className="size-3.5" /> Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "project" : "projects"} found
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <FolderKanban className="size-8 text-muted-foreground" />
          <div>
            <p className="font-heading text-lg font-semibold">No matches</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting or clearing your filters.</p>
          </div>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              clients={clients}
              industryName={industries.find((i) => i.id === project.industryId)?.name}
              skills={getProjectSkillDetails(projectSkills, skills, project.id)}
              teamSize={getProjectMemberDetails(projectMembers, people, project.id).length}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Timeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((project) => (
                <TableRow key={project.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/projects/${project.id}`} className="flex items-center gap-2.5 font-medium hover:text-primary">
                      <ProjectAvatar project={project} clients={clients} size="sm" />
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {industries.find((i) => i.id === project.industryId)?.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={PROJECT_STATUS_BADGE[project.status]}>
                      {PROJECT_STATUS_LABEL[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getProjectMemberDetails(projectMembers, people, project.id).length}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(project.startDate)}
                    {project.endDate ? ` – ${formatDate(project.endDate)}` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
    </RoleGate>
  );
}
