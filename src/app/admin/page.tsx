"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, UploadCloud, Layers } from "lucide-react";
import { RoleGate } from "@/components/shared/role-gate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CsvImportWizard } from "@/components/admin/csv-import-wizard";
import { PEOPLE_IMPORT_FIELDS, PROJECT_IMPORT_FIELDS } from "@/lib/csv-import";
import { selectLabel } from "@/lib/select-utils";
import { useAppStore } from "@/store/app-store-provider";
import { DEPARTMENTS, type Department, type Person, type Project, type SkillCategory } from "@/lib/types";

const SKILL_CATEGORIES: SkillCategory[] = [
  "Cloud",
  "Software Development",
  "Data & AI",
  "Telco",
  "Infrastructure",
  "Cybersecurity",
  "Project Management",
  "Business",
  "Sales",
  "Design / UX",
];

export default function AdminPage() {
  const people = useAppStore((s) => s.people);
  const industries = useAppStore((s) => s.industries);
  const locations = useAppStore((s) => s.locations);
  const skills = useAppStore((s) => s.skills);
  const importPeople = useAppStore((s) => s.importPeople);
  const importProjects = useAppStore((s) => s.importProjects);
  const addSkill = useAppStore((s) => s.addSkill);
  const removeSkill = useAppStore((s) => s.removeSkill);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>("Cloud");

  const skillsByCategory = new Map<string, typeof skills>();
  for (const s of skills) {
    const list = skillsByCategory.get(s.category) ?? [];
    list.push(s);
    skillsByCategory.set(s.category, list);
  }

  function handleImportPeople(rows: Record<string, string>[]): number {
    const now = new Date().toISOString().slice(0, 10);
    const newPeople: Person[] = rows.map((row, i) => {
      const location = locations.find((l) => l.city.toLowerCase() === row.city?.toLowerCase());
      const department = DEPARTMENTS.find(
        (d) => d.toLowerCase() === row.department?.trim().toLowerCase()
      ) as Department | undefined;
      return {
        id: `person-import-${Date.now()}-${i}`,
        firstName: row.firstName,
        lastName: row.lastName,
        avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(row.firstName + row.lastName)}`,
        jobTitle: row.jobTitle,
        department: department ?? DEPARTMENTS[0],
        locationId: (location ?? locations[0]).id,
        bio: row.bio || `${row.firstName} recently joined the team as ${row.jobTitle}.`,
        interestIds: [],
        industryExperienceIds: [],
        joinedDate: now,
      };
    });
    importPeople(newPeople);
    return newPeople.length;
  }

  function handleImportProjects(rows: Record<string, string>[]): number {
    const validStatuses = ["planned", "active", "completed"];
    const newProjects: Project[] = rows.map((row, i) => {
      const industry = industries.find((ind) => ind.name.toLowerCase() === row.industry?.toLowerCase());
      const status = validStatuses.includes(row.status?.toLowerCase()) ? (row.status.toLowerCase() as Project["status"]) : "planned";
      return {
        id: `project-import-${Date.now()}-${i}`,
        name: row.name,
        clientName: row.clientName,
        industryId: (industry ?? industries[0]).id,
        shortDescription: row.shortDescription || "",
        projectType: row.projectType || "Consulting Engagement",
        startDate: row.startDate || new Date().toISOString().slice(0, 10),
        endDate: null,
        status,
        leadPersonId: people[0]?.id ?? "",
        outcomes: [],
        currency: "EUR",
        totalBudget: 0,
      };
    });
    importProjects(newProjects);
    return newProjects.length;
  }

  function handleAddSkill() {
    if (!newSkillName.trim()) return;
    const id = `skill-custom-${Date.now()}`;
    addSkill({ id, name: newSkillName.trim(), category: newSkillCategory });
    toast.success("Skill added to catalog");
    setNewSkillName("");
  }

  return (
    <RoleGate allow={["admin"]}>
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">CSV imports and master data — admin only.</p>
        </div>

        <Tabs defaultValue="import">
          <TabsList>
            <TabsTrigger value="import">
              <UploadCloud className="size-3.5" /> CSV Import
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Layers className="size-3.5" /> Skill Catalog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6 shadow-elevation-1">
                <h2 className="font-heading text-base font-semibold">Import People</h2>
                <p className="mt-1 mb-5 text-sm text-muted-foreground">Add colleagues in bulk from a CSV export.</p>
                <CsvImportWizard
                  entityLabel="people"
                  fields={PEOPLE_IMPORT_FIELDS}
                  sampleUrl="/samples/people-import-sample.csv"
                  onImport={handleImportPeople}
                />
              </Card>
              <Card className="p-6 shadow-elevation-1">
                <h2 className="font-heading text-base font-semibold">Import Projects</h2>
                <p className="mt-1 mb-5 text-sm text-muted-foreground">Add reference projects in bulk from a CSV export.</p>
                <CsvImportWizard
                  entityLabel="projects"
                  fields={PROJECT_IMPORT_FIELDS}
                  sampleUrl="/samples/projects-import-sample.csv"
                  onImport={handleImportProjects}
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Skill catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The shared vocabulary used across People, Projects and the Skill Matrix.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
                <Input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="New skill name…"
                  className="max-w-xs"
                />
                <Select value={newSkillCategory} onValueChange={(v) => v && setNewSkillCategory(v as SkillCategory)}>
                  <SelectTrigger size="sm" className="w-[200px]">
                    <SelectValue>
                      {selectLabel(
                        SKILL_CATEGORIES.map((c) => ({ value: c, label: c })),
                        "Category"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddSkill} disabled={!newSkillName.trim()}>
                  <Plus /> Add skill
                </Button>
              </div>

              <div className="mt-6 flex flex-col gap-5">
                {Array.from(skillsByCategory.entries()).map(([category, items]) => (
                  <div key={category}>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((s) => (
                        <Badge key={s.id} variant="secondary" className="gap-1 font-normal">
                          {s.name}
                          <button onClick={() => removeSkill(s.id)} aria-label={`Remove ${s.name}`} className="ml-0.5 rounded-full hover:text-destructive">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
