"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, UploadCloud, Layers, Heart, Award, MapPin, Briefcase } from "lucide-react";
import { RoleGate } from "@/components/shared/role-gate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/** Shared add/remove list editor for flat {id, name} catalogs (Interests, Roles). */
function SimpleCatalogEditor({
  title,
  description,
  placeholder,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  description: string;
  placeholder: string;
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  }

  return (
    <Card className="p-6 shadow-elevation-1">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={placeholder}
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={!name.trim()}>
          <Plus /> Add
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {[...items]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 font-normal">
              {item.name}
              <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} className="ml-0.5 rounded-full hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const people = useAppStore((s) => s.people);
  const industries = useAppStore((s) => s.industries);
  const locations = useAppStore((s) => s.locations);
  const skills = useAppStore((s) => s.skills);
  const interests = useAppStore((s) => s.interests);
  const certifications = useAppStore((s) => s.certifications);
  const roles = useAppStore((s) => s.roles);

  const importPeople = useAppStore((s) => s.importPeople);
  const importProjects = useAppStore((s) => s.importProjects);
  const addSkill = useAppStore((s) => s.addSkill);
  const removeSkill = useAppStore((s) => s.removeSkill);
  const addLocation = useAppStore((s) => s.addLocation);
  const removeLocation = useAppStore((s) => s.removeLocation);
  const addCertification = useAppStore((s) => s.addCertification);
  const removeCertification = useAppStore((s) => s.removeCertification);
  const addInterest = useAppStore((s) => s.addInterest);
  const removeInterest = useAppStore((s) => s.removeInterest);
  const addRole = useAppStore((s) => s.addRole);
  const removeRole = useAppStore((s) => s.removeRole);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>("Cloud");

  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");

  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newRegion, setNewRegion] = useState("EMEA");

  const skillsByCategory = new Map<string, typeof skills>();
  for (const s of skills) {
    const list = skillsByCategory.get(s.category) ?? [];
    list.push(s);
    skillsByCategory.set(s.category, list);
  }

  function resolveRoleName(rawJobTitle: string | undefined): string {
    const trimmed = rawJobTitle?.trim();
    if (!trimmed) return roles[0]?.name ?? "";
    const existing = roles.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.name;
    addRole({ name: trimmed });
    return trimmed;
  }

  function handleImportPeople(rows: Record<string, string>[]): number {
    const now = new Date().toISOString().slice(0, 10);
    const newPeople: Person[] = rows.map((row, i) => {
      const location = locations.find((l) => l.city.toLowerCase() === row.city?.toLowerCase());
      const department = DEPARTMENTS.find(
        (d) => d.toLowerCase() === row.department?.trim().toLowerCase()
      ) as Department | undefined;
      const jobTitle = resolveRoleName(row.jobTitle);
      return {
        id: `person-import-${Date.now()}-${i}`,
        firstName: row.firstName,
        lastName: row.lastName,
        avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(row.firstName + row.lastName)}`,
        jobTitle,
        department: department ?? DEPARTMENTS[0],
        locationId: (location ?? locations[0]).id,
        bio: row.bio || `${row.firstName} recently joined the team as ${jobTitle}.`,
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

  function handleAddCertification() {
    if (!newCertName.trim() || !newCertIssuer.trim()) return;
    addCertification({ name: newCertName.trim(), issuer: newCertIssuer.trim() });
    toast.success("Certification added to catalog");
    setNewCertName("");
    setNewCertIssuer("");
  }

  function handleRemoveCertification(id: string) {
    removeCertification(id);
    toast.success("Certification removed");
  }

  function handleAddLocation() {
    if (!newCity.trim() || !newCountry.trim()) return;
    addLocation({ city: newCity.trim(), country: newCountry.trim(), region: newRegion.trim() || "EMEA" });
    toast.success("Location added to catalog");
    setNewCity("");
    setNewCountry("");
  }

  function handleRemoveLocation(id: string) {
    if (people.some((p) => p.locationId === id)) {
      toast.error("Can't remove a location that people are currently assigned to");
      return;
    }
    removeLocation(id);
    toast.success("Location removed");
  }

  function handleAddInterest(name: string) {
    addInterest({ name });
    toast.success("Interest added to catalog");
  }

  function handleRemoveInterest(id: string) {
    removeInterest(id);
    toast.success("Interest removed");
  }

  function handleAddRole(name: string) {
    addRole({ name });
    toast.success("Role added to catalog");
  }

  function handleRemoveRole(id: string) {
    const role = roles.find((r) => r.id === id);
    if (role && people.some((p) => p.jobTitle === role.name)) {
      toast.error("Can't remove a role that people currently hold");
      return;
    }
    removeRole(id);
    toast.success("Role removed");
  }

  return (
    <RoleGate allow={["admin"]}>
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">CSV imports and master data — admin only.</p>
        </div>

        <Tabs defaultValue="import">
          <TabsList className="flex-wrap">
            <TabsTrigger value="import">
              <UploadCloud className="size-3.5" /> CSV Import
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Layers className="size-3.5" /> Skill Catalog
            </TabsTrigger>
            <TabsTrigger value="interests">
              <Heart className="size-3.5" /> Interests
            </TabsTrigger>
            <TabsTrigger value="certifications">
              <Award className="size-3.5" /> Certifications
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPin className="size-3.5" /> Locations
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Briefcase className="size-3.5" /> Roles
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

          <TabsContent value="interests" className="mt-4">
            <SimpleCatalogEditor
              title="Interests catalog"
              description="Hobbies & interests people can pick from on their profile."
              placeholder="New interest name…"
              items={interests}
              onAdd={handleAddInterest}
              onRemove={handleRemoveInterest}
            />
          </TabsContent>

          <TabsContent value="certifications" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Certifications catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The shared list of certifications people can add to their profile.
              </p>

              <div className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                <div>
                  <Label htmlFor="cert-name" className="mb-1.5">
                    Name
                  </Label>
                  <Input
                    id="cert-name"
                    value={newCertName}
                    onChange={(e) => setNewCertName(e.target.value)}
                    placeholder="AWS Certified Solutions Architect"
                    className="w-64"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-issuer" className="mb-1.5">
                    Issuer
                  </Label>
                  <Input
                    id="cert-issuer"
                    value={newCertIssuer}
                    onChange={(e) => setNewCertIssuer(e.target.value)}
                    placeholder="Amazon Web Services"
                    className="w-56"
                  />
                </div>
                <Button size="sm" onClick={handleAddCertification} disabled={!newCertName.trim() || !newCertIssuer.trim()}>
                  <Plus /> Add certification
                </Button>
              </div>

              <div className="mt-6 flex flex-col divide-y divide-border/70">
                {[...certifications]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.issuer}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveCertification(c.id)}
                        aria-label={`Remove ${c.name}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                {certifications.length === 0 && <p className="py-3 text-sm text-muted-foreground">No entries yet.</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Locations catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">Office locations people can be assigned to.</p>

              <div className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                <div>
                  <Label htmlFor="loc-city" className="mb-1.5">
                    City
                  </Label>
                  <Input id="loc-city" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Vienna" className="w-40" />
                </div>
                <div>
                  <Label htmlFor="loc-country" className="mb-1.5">
                    Country
                  </Label>
                  <Input
                    id="loc-country"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="Austria"
                    className="w-40"
                  />
                </div>
                <div>
                  <Label htmlFor="loc-region" className="mb-1.5">
                    Region
                  </Label>
                  <Input id="loc-region" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} className="w-28" />
                </div>
                <Button size="sm" onClick={handleAddLocation} disabled={!newCity.trim() || !newCountry.trim()}>
                  <Plus /> Add location
                </Button>
              </div>

              <div className="mt-6 flex flex-col divide-y divide-border/70">
                {[...locations]
                  .sort((a, b) => a.city.localeCompare(b.city))
                  .map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.city}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.country} · {l.region}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveLocation(l.id)} aria-label={`Remove ${l.city}`}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                {locations.length === 0 && <p className="py-3 text-sm text-muted-foreground">No entries yet.</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <SimpleCatalogEditor
              title="Roles catalog"
              description="Predetermined job titles people can be assigned to — chosen from this list, not free text."
              placeholder="New role name…"
              items={roles}
              onAdd={handleAddRole}
              onRemove={handleRemoveRole}
            />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
