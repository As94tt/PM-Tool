"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, FolderPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { useAppStore } from "@/store/app-store-provider";
import { fullName } from "@/lib/data/queries";
import { selectLabel } from "@/lib/select-utils";
import type { Project, ProjectStatus } from "@/lib/types";

const ROLE_OPTIONS = [
  "Solution Architect",
  "Lead Developer",
  "Business Analyst",
  "QA Engineer",
  "Data Engineer",
  "UX Designer",
  "DevOps Engineer",
  "Consultant",
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

interface TeamRow {
  personId: string;
  roleOnProject: string;
}

export function ProjectFormSheet({ project }: { project?: Project }) {
  const router = useRouter();
  const isEdit = Boolean(project);
  const [open, setOpen] = useState(false);

  const people = useAppStore((s) => s.people);
  const industries = useAppStore((s) => s.industries);
  const skills = useAppStore((s) => s.skills);
  const clients = useAppStore((s) => s.clients);
  const projects = useAppStore((s) => s.projects);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const projectSkills = useAppStore((s) => s.projectSkills);
  const createProject = useAppStore((s) => s.createProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const setProjectTeam = useAppStore((s) => s.setProjectTeam);
  const setProjectSkills = useAppStore((s) => s.setProjectSkills);

  const projectTypes = Array.from(new Set(projects.map((p) => p.projectType))).toSorted();

  const existingMembers: TeamRow[] = project
    ? projectMembers.filter((m) => m.projectId === project.id).map((m) => ({ personId: m.personId, roleOnProject: m.roleOnProject }))
    : [];
  const existingSkillIds = project ? projectSkills.filter((s) => s.projectId === project.id).map((s) => s.skillId) : [];

  const [name, setName] = useState(project?.name ?? "");
  const [clientName, setClientName] = useState(project?.clientName ?? "");
  const [industryId, setIndustryId] = useState(project?.industryId ?? industries[0]?.id ?? "");
  const [projectType, setProjectType] = useState(project?.projectType ?? projectTypes[0] ?? "Consulting Engagement");
  const [shortDescription, setShortDescription] = useState(project?.shortDescription ?? "");
  const [startDate, setStartDate] = useState(project?.startDate ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(project?.endDate ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planned");
  const [leadPersonId, setLeadPersonId] = useState(project?.leadPersonId ?? people[0]?.id ?? "");
  const [outcomes, setOutcomes] = useState(project?.outcomes.join("\n") ?? "");
  const [totalBudget, setTotalBudget] = useState(String(project?.totalBudget ?? 0));
  const [imageUrl, setImageUrl] = useState<string | undefined>(project?.imageUrl);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(existingSkillIds);
  const [team, setTeam] = useState<TeamRow[]>(existingMembers);
  const [addPersonId, setAddPersonId] = useState("");
  const [addRole, setAddRole] = useState(ROLE_OPTIONS[0]);

  const skillsByCategory = new Map<string, typeof skills>();
  for (const s of skills) {
    const list = skillsByCategory.get(s.category) ?? [];
    list.push(s);
    skillsByCategory.set(s.category, list);
  }

  const peopleOptions = people.map((p) => ({ value: p.id, label: fullName(p) }));
  const industryOptions = industries.map((i) => ({ value: i.id, label: i.name }));
  const projectTypeOptions = projectTypes.map((t) => ({ value: t, label: t }));
  const statusOptions = STATUS_OPTIONS;
  const availablePeopleForTeam = people.filter((p) => !team.some((t) => t.personId === p.id));

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function addTeamMember() {
    if (!addPersonId) return;
    setTeam((prev) => [...prev, { personId: addPersonId, roleOnProject: addRole }]);
    setAddPersonId("");
  }

  function removeTeamMember(personId: string) {
    setTeam((prev) => prev.filter((t) => t.personId !== personId));
  }

  function resetForm() {
    setName("");
    setClientName("");
    setShortDescription("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setStatus("planned");
    setOutcomes("");
    setTotalBudget("0");
    setImageUrl(undefined);
    setSelectedSkillIds([]);
    setTeam([]);
  }

  function handleSubmit() {
    if (!name.trim() || !clientName.trim() || !leadPersonId) {
      toast.error("Name, client and project lead are required");
      return;
    }

    const outcomesList = outcomes
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    if (isEdit && project) {
      updateProject(project.id, {
        name,
        clientName,
        industryId,
        projectType,
        shortDescription,
        startDate,
        endDate: endDate || null,
        status,
        leadPersonId,
        outcomes: outcomesList,
        totalBudget: Number(totalBudget) || 0,
        imageUrl,
      });
      setProjectTeam(project.id, team);
      setProjectSkills(project.id, selectedSkillIds);
      toast.success("Project updated");
      setOpen(false);
      return;
    }

    const id = `project-${Date.now()}`;
    createProject(
      {
        id,
        name,
        clientName,
        industryId,
        projectType,
        shortDescription,
        startDate,
        endDate: endDate || null,
        status,
        leadPersonId,
        outcomes: outcomesList,
        currency: "EUR",
        totalBudget: Number(totalBudget) || 0,
        imageUrl,
      },
      [
        { projectId: id, personId: leadPersonId, roleOnProject: "Project Lead" },
        ...team.filter((t) => t.personId !== leadPersonId).map((t) => ({ projectId: id, ...t })),
      ],
      selectedSkillIds
    );
    toast.success("Project created");
    setOpen(false);
    resetForm();
    router.push(`/projects/${id}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"} />}>
        {isEdit ? "Edit project" : (
          <>
            <FolderPlus /> New project
          </>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{isEdit ? "Edit project" : "New project"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update project experience details." : "Add a project to the experience database."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100svh-10rem)]">
          <div className="flex flex-col gap-5 px-6 py-6">
            <ImageUploadField label="Project picture (optional)" value={imageUrl} onChange={setImageUrl} shape="circle" />

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="p-name" className="mb-1.5">
                  Project name
                </Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Orion Cloud Migration" />
              </div>
              <div>
                <Label htmlFor="p-client" className="mb-1.5">
                  Client
                </Label>
                <Input
                  id="p-client"
                  list="pf-client-names"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name"
                />
                <datalist id="pf-client-names">
                  {clients.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Match an existing customer name to reuse their logo — manage customers on the Customers page.
                </p>
              </div>
              <div>
                <Label className="mb-1.5">Industry</Label>
                <Select value={industryId} onValueChange={(v) => v && setIndustryId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(industryOptions, "Industry")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Project type</Label>
                <Select value={projectType} onValueChange={(v) => v && setProjectType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(projectTypeOptions, "Type")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v as ProjectStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(statusOptions, "Status")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="p-start" className="mb-1.5">
                  Start date
                </Label>
                <Input id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-end" className="mb-1.5">
                  End date
                </Label>
                <Input id="p-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5">Project lead</Label>
                <Select value={leadPersonId} onValueChange={(v) => v && setLeadPersonId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(peopleOptions, "Project lead")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {fullName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="p-budget" className="mb-1.5">
                  Total budget (EUR)
                </Label>
                <Input
                  id="p-budget"
                  type="number"
                  min={0}
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="p-desc" className="mb-1.5">
                Short description
              </Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One or two sentences describing the engagement."
              />
            </div>

            <div>
              <Label htmlFor="p-outcomes" className="mb-1.5">
                Key outcomes (one per line)
              </Label>
              <Textarea
                id="p-outcomes"
                rows={3}
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                placeholder={"Reduced cost by 30%\nDelivered ahead of schedule"}
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Skills & technologies</h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => {
                  const active = selectedSkillIds.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSkill(s.id)} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Badge variant={active ? "default" : "secondary"} className="cursor-pointer font-normal">
                        {s.name}
                        {active && <X className="size-3" />}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Team</h3>
              <div className="flex flex-col gap-2">
                {team.map((t) => {
                  const p = people.find((person) => person.id === t.personId);
                  if (!p) return null;
                  return (
                    <div key={t.personId} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="flex-1 truncate text-sm">{fullName(p)}</span>
                      <span className="text-xs text-muted-foreground">{t.roleOnProject}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeTeamMember(t.personId)} aria-label={`Remove ${fullName(p)}`}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Select value={addPersonId || "none"} onValueChange={(v) => setAddPersonId(v && v !== "none" ? v : "")}>
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue placeholder="Add a team member…">
                      {selectLabel([{ value: "none", label: "Add a team member…" }, ...peopleOptions], "Add a team member…")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select a person
                    </SelectItem>
                    {availablePeopleForTeam.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {fullName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addRole} onValueChange={(v) => v && setAddRole(v)}>
                  <SelectTrigger size="sm" className="w-[160px]">
                    <SelectValue>{selectLabel(ROLE_OPTIONS.map((r) => ({ value: r, label: r })), "Role")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addTeamMember} disabled={!addPersonId}>
                  <Plus />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEdit ? "Save changes" : "Create project"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
