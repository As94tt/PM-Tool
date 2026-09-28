"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, FolderPlus } from "lucide-react";
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
import { PROJECT_STATUS_OPTIONS } from "@/lib/project-status";
import { todayLocalDate } from "@/lib/format";
import type { Project, ProjectStatus } from "@/lib/types";

interface TeamRow {
  personId: string;
  roleOnProject: string;
  contributionDescription?: string;
}

/** Builds the guaranteed-on-the-team rows for Project Lead / Delivery
 * Responsible / Sales Responsible — skips a slot whose person is empty or
 * already claimed by an earlier (higher-priority) slot, so the same person
 * picked for two leadership fields only ever produces one row, and
 * preserves that person's existing role label / contribution description
 * from `currentMembers` when they're already on the team rather than
 * resetting it to the slot's default label. Shared by both the create and
 * edit submit paths so they can't drift out of sync with each other again. */
function buildLeadershipRows(
  slots: { personId: string; defaultRole: string }[],
  currentMembers: TeamRow[]
): TeamRow[] {
  const seen = new Set<string>();
  const rows: TeamRow[] = [];
  for (const { personId, defaultRole } of slots) {
    if (!personId || seen.has(personId)) continue;
    seen.add(personId);
    const current = currentMembers.find((m) => m.personId === personId);
    rows.push({
      personId,
      roleOnProject: current?.roleOnProject ?? defaultRole,
      contributionDescription: current?.contributionDescription,
    });
  }
  return rows;
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

  const existingSkillIds = project ? projectSkills.filter((s) => s.projectId === project.id).map((s) => s.skillId) : [];

  const [name, setName] = useState(project?.name ?? "");
  const [clientName, setClientName] = useState(project?.clientName ?? "");
  const [industryId, setIndustryId] = useState(project?.industryId ?? industries[0]?.id ?? "");
  const [projectType, setProjectType] = useState(project?.projectType ?? projectTypes[0] ?? "Consulting Engagement");
  const [shortDescription, setShortDescription] = useState(project?.shortDescription ?? "");
  const [startDate, setStartDate] = useState(project?.startDate ?? todayLocalDate());
  const [endDate, setEndDate] = useState(project?.endDate ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "lead");
  const [leadPersonId, setLeadPersonId] = useState(project?.leadPersonId ?? people[0]?.id ?? "");
  const [deliveryResponsibleId, setDeliveryResponsibleId] = useState(project?.deliveryResponsiblePersonId ?? "");
  const [salesResponsibleId, setSalesResponsibleId] = useState(project?.salesResponsiblePersonId ?? "");
  const [outcomes, setOutcomes] = useState(project?.outcomes.join("\n") ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(project?.imageUrl);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(existingSkillIds);

  const peopleOptions = people.map((p) => ({ value: p.id, label: fullName(p) }));
  const deliveryResponsibleOptions = [{ value: "none", label: "None" }, ...peopleOptions];
  const salesResponsibleOptions = [{ value: "none", label: "None" }, ...peopleOptions];
  const industryOptions = industries.map((i) => ({ value: i.id, label: i.name }));
  const projectTypeOptions = projectTypes.map((t) => ({ value: t, label: t }));
  const statusOptions = PROJECT_STATUS_OPTIONS;

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function resetForm() {
    setName("");
    setClientName("");
    setShortDescription("");
    setStartDate(todayLocalDate());
    setEndDate("");
    setStatus("lead");
    setOutcomes("");
    setImageUrl(undefined);
    setDeliveryResponsibleId("");
    setSalesResponsibleId("");
    setSelectedSkillIds([]);
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
        deliveryResponsiblePersonId: deliveryResponsibleId || undefined,
        salesResponsiblePersonId: salesResponsibleId || undefined,
        outcomes: outcomesList,
        imageUrl,
      });
      // Team membership itself is managed from the Resource & Budget
      // Planning dialog now — this form only guarantees the three
      // leadership roles are on the team (adding them if picking someone
      // new), reading the *current* membership straight from the store
      // rather than a local copy, so every other existing member (and any
      // change made from the Planning dialog since this sheet was opened)
      // is preserved exactly as-is — role label AND contribution
      // description included, not just their personId.
      const currentMembers: TeamRow[] = projectMembers
        .filter((m) => m.projectId === project.id)
        .map((m) => ({ personId: m.personId, roleOnProject: m.roleOnProject, contributionDescription: m.contributionDescription }));
      const leadershipRows = buildLeadershipRows(
        [
          { personId: leadPersonId, defaultRole: "Project Lead" },
          { personId: deliveryResponsibleId, defaultRole: "Delivery Responsible" },
          { personId: salesResponsibleId, defaultRole: "Sales Responsible" },
        ],
        currentMembers
      );
      const leadershipIds = new Set(leadershipRows.map((r) => r.personId));
      const fullTeam: TeamRow[] = [
        ...leadershipRows,
        ...currentMembers.filter((m) => !leadershipIds.has(m.personId)),
      ];
      setProjectTeam(project.id, fullTeam);
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
        deliveryResponsiblePersonId: deliveryResponsibleId || undefined,
        salesResponsiblePersonId: salesResponsibleId || undefined,
        outcomes: outcomesList,
        currency: "EUR",
        totalBudget: 0,
        imageUrl,
      },
      [
        ...buildLeadershipRows(
          [
            { personId: leadPersonId, defaultRole: "Project Lead" },
            { personId: deliveryResponsibleId, defaultRole: "Delivery Responsible" },
            { personId: salesResponsibleId, defaultRole: "Sales Responsible" },
          ],
          []
        ).map((r) => ({ projectId: id, personId: r.personId, roleOnProject: r.roleOnProject })),
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
                    {PROJECT_STATUS_OPTIONS.map((s) => (
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
                <Label className="mb-1.5">Delivery responsible</Label>
                <Select
                  value={deliveryResponsibleId || "none"}
                  onValueChange={(v) => setDeliveryResponsibleId(v && v !== "none" ? v : "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(deliveryResponsibleOptions, "Delivery responsible")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryResponsibleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5">Sales responsible</Label>
                <Select
                  value={salesResponsibleId || "none"}
                  onValueChange={(v) => setSalesResponsibleId(v && v !== "none" ? v : "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(salesResponsibleOptions, "Sales responsible")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {salesResponsibleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
