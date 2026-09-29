"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  X,
  UploadCloud,
  Layers,
  Heart,
  Award,
  MapPin,
  Briefcase,
  Languages,
  UserCog,
  KeyRound,
  Trash2,
  DatabaseBackup,
  TriangleAlert,
} from "lucide-react";
import { RoleGate } from "@/components/shared/role-gate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CsvImportWizard } from "@/components/admin/csv-import-wizard";
import { PEOPLE_IMPORT_FIELDS, PROJECT_IMPORT_FIELDS } from "@/lib/csv-import";
import { selectLabel } from "@/lib/select-utils";
import { groupBy } from "@/lib/utils";
import { fullName, initials } from "@/lib/data/queries";
import { useAppStore, useAppStoreApi } from "@/store/app-store-provider";
import { useCanViewFunction, useCanEditFunction } from "@/store/hooks";
import {
  APP_FUNCTIONS,
  ADMIN_FUNCTION_KEYS,
  ROLE_LABEL,
  PERMISSION_LEVEL_LABEL,
  getPermission,
  type PermissionLevel,
} from "@/lib/permissions";
import { PROJECT_STATUSES } from "@/lib/project-status";
import { todayLocalDate } from "@/lib/format";
import { DEPARTMENTS, type AppRole, type Department, type Person, type Project, type SkillCategory } from "@/lib/types";

const ROLE_OPTIONS: AppRole[] = ["user", "management", "admin"];
const PERMISSION_LEVEL_OPTIONS: PermissionLevel[] = ["hidden", "view", "edit"];

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
  readOnly = false,
}: {
  title: string;
  description: string;
  placeholder: string;
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
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

      {!readOnly && (
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
      )}

      <div className="mt-6 flex flex-wrap gap-1.5">
        {[...items]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 font-normal">
              {item.name}
              {!readOnly && (
                <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} className="ml-0.5 rounded-full hover:text-destructive">
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const storeApi = useAppStoreApi();
  const people = useAppStore((s) => s.people);
  const industries = useAppStore((s) => s.industries);
  const locations = useAppStore((s) => s.locations);
  const skills = useAppStore((s) => s.skills);
  const interests = useAppStore((s) => s.interests);
  const certifications = useAppStore((s) => s.certifications);
  const roles = useAppStore((s) => s.roles);
  const languages = useAppStore((s) => s.languages);
  const users = useAppStore((s) => s.users);
  const permissions = useAppStore((s) => s.permissions);
  const canViewMasterData = useCanViewFunction("admin-master-data");
  const canEditMasterData = useCanEditFunction("admin-master-data");
  const canViewUsers = useCanViewFunction("admin-users");
  const canEditUsers = useCanEditFunction("admin-users");
  const canViewPermissions = useCanViewFunction("admin-permissions");
  const canEditPermissions = useCanEditFunction("admin-permissions");

  const importPeople = useAppStore((s) => s.importPeople);
  const setPersonRole = useAppStore((s) => s.setPersonRole);
  const removeUser = useAppStore((s) => s.removeUser);
  const setPermission = useAppStore((s) => s.setPermission);
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
  const addLanguage = useAppStore((s) => s.addLanguage);
  const removeLanguage = useAppStore((s) => s.removeLanguage);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>("Cloud");

  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");

  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newRegion, setNewRegion] = useState("EMEA");

  const skillsByCategory = groupBy(skills, (s) => s.category);

  function resolveRoleName(rawJobTitle: string | undefined): string {
    const trimmed = rawJobTitle?.trim();
    if (!trimmed) return roles[0]?.name ?? "";
    const existing = roles.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.name;
    addRole({ name: trimmed });
    return trimmed;
  }

  function handleImportPeople(rows: Record<string, string>[]): number {
    const now = todayLocalDate();
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
        languages: [],
        projectStrengths: [],
        whyThisPerson: "",
      };
    });
    importPeople(newPeople);
    // Every new person gets a login/role record, defaulting to "User" —
    // same as the "New person" form, just for the bulk-import path.
    for (const person of newPeople) setPersonRole(person.id, "user");
    return newPeople.length;
  }

  function handleImportProjects(rows: Record<string, string>[]): number {
    // Tolerant of "Offer Sent", "offer-sent", "offerSent", etc. — strip
    // everything but letters before matching so CSV authors don't have to
    // know the exact camelCase key.
    const normalizeStatusKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    const statusByNormalizedKey = new Map(PROJECT_STATUSES.map((s) => [normalizeStatusKey(s), s]));
    let unrecognizedStatusCount = 0;
    const newProjects: Project[] = rows.map((row, i) => {
      const industry = industries.find((ind) => ind.name.toLowerCase() === row.industry?.toLowerCase());
      const matchedStatus = statusByNormalizedKey.get(normalizeStatusKey(row.status ?? ""));
      if (!matchedStatus && row.status?.trim()) unrecognizedStatusCount++;
      const status = matchedStatus ?? "lead";
      return {
        id: `project-import-${Date.now()}-${i}`,
        name: row.name,
        clientName: row.clientName,
        industryId: (industry ?? industries[0]).id,
        shortDescription: row.shortDescription || "",
        projectType: row.projectType || "Consulting Engagement",
        startDate: row.startDate || todayLocalDate(),
        endDate: null,
        status,
        leadPersonId: people[0]?.id ?? "",
        outcomes: [],
        currency: "EUR",
        totalBudget: 0,
      };
    });
    importProjects(newProjects);
    if (unrecognizedStatusCount > 0) {
      toast.warning(
        `${unrecognizedStatusCount} project${unrecognizedStatusCount === 1 ? "" : "s"} had an unrecognized status and defaulted to "Lead"`
      );
    }
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

  function handleAddLanguage(name: string) {
    addLanguage({ name });
    toast.success("Language added to catalog");
  }

  function handleRemoveLanguage(id: string) {
    const language = languages.find((l) => l.id === id);
    if (language && people.some((p) => p.languages.some((pl) => pl.name === language.name))) {
      toast.error("Can't remove a language people currently speak");
      return;
    }
    removeLanguage(id);
    toast.success("Language removed");
  }

  // Regenerating scripts/generate-data.mjs's output only changes the
  // fresh-install seed — an existing browser's persisted state is never
  // overwritten by it (persist's merge/migrate only ever repair or extend
  // what's already stored, never replace it wholesale). This is the only
  // way to actually get back to that fresh seed from an already-persisted
  // session, short of manually clearing site data.
  function handleResetDemoData() {
    storeApi.persist.clearStorage();
    window.location.reload();
  }

  function handleChangePersonRole(personId: string, role: AppRole) {
    setPersonRole(personId, role);
    toast.success("Role updated");
  }

  function handleRemoveUser(personId: string, name: string) {
    removeUser(personId);
    toast.success(`${name}'s account was deleted`);
  }

  function handleChangePermission(functionKey: string, role: AppRole, level: PermissionLevel) {
    // Admins always keep at least view access to the Permissions tab
    // itself — otherwise this table could lock every admin out with no
    // way back in to ever undo the change.
    if (functionKey === "admin-permissions" && role === "admin" && level === "hidden") return;
    setPermission(functionKey, role, level);
  }

  const defaultTab = canViewMasterData ? "import" : canViewUsers ? "users" : "permissions";

  return (
    <RoleGate functionKey={ADMIN_FUNCTION_KEYS}>
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">CSV imports and master data — admin only.</p>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap">
            {canViewMasterData && (
              <>
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
                <TabsTrigger value="languages">
                  <Languages className="size-3.5" /> Languages
                </TabsTrigger>
                <TabsTrigger value="data">
                  <DatabaseBackup className="size-3.5" /> Data
                </TabsTrigger>
              </>
            )}
            {canViewUsers && (
              <TabsTrigger value="users">
                <UserCog className="size-3.5" /> Users
              </TabsTrigger>
            )}
            {canViewPermissions && (
              <TabsTrigger value="permissions">
                <KeyRound className="size-3.5" /> Permissions
              </TabsTrigger>
            )}
          </TabsList>

          {canViewMasterData && (
          <TabsContent value="import" className="mt-4">
            {!canEditMasterData ? (
              <p className="text-sm text-muted-foreground">You have view-only access to master data.</p>
            ) : (
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
            )}
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="skills" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Skill catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The shared vocabulary used across People, Projects and the Skill Matrix.
              </p>

              {canEditMasterData && (
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
              )}

              <div className="mt-6 flex flex-col gap-5">
                {Array.from(skillsByCategory.entries()).map(([category, items]) => (
                  <div key={category}>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((s) => (
                        <Badge key={s.id} variant="secondary" className="gap-1 font-normal">
                          {s.name}
                          {canEditMasterData && (
                            <button onClick={() => removeSkill(s.id)} aria-label={`Remove ${s.name}`} className="ml-0.5 rounded-full hover:text-destructive">
                              <X className="size-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="interests" className="mt-4">
            <SimpleCatalogEditor
              title="Interests catalog"
              description="Hobbies & interests people can pick from on their profile."
              placeholder="New interest name…"
              items={interests}
              onAdd={handleAddInterest}
              onRemove={handleRemoveInterest}
              readOnly={!canEditMasterData}
            />
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="certifications" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Certifications catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The shared list of certifications people can add to their profile.
              </p>

              {canEditMasterData && (
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
              )}

              <div className="mt-6 flex flex-col divide-y divide-border/70">
                {[...certifications]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.issuer}</p>
                      </div>
                      {canEditMasterData && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveCertification(c.id)}
                          aria-label={`Remove ${c.name}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                {certifications.length === 0 && <p className="py-3 text-sm text-muted-foreground">No entries yet.</p>}
              </div>
            </Card>
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="locations" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Locations catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">Office locations people can be assigned to.</p>

              {canEditMasterData && (
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
              )}

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
                      {canEditMasterData && (
                        <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveLocation(l.id)} aria-label={`Remove ${l.city}`}>
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                {locations.length === 0 && <p className="py-3 text-sm text-muted-foreground">No entries yet.</p>}
              </div>
            </Card>
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="roles" className="mt-4">
            <SimpleCatalogEditor
              title="Roles catalog"
              description="Predetermined job titles people can be assigned to — chosen from this list, not free text."
              placeholder="New role name…"
              items={roles}
              onAdd={handleAddRole}
              onRemove={handleRemoveRole}
              readOnly={!canEditMasterData}
            />
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="languages" className="mt-4">
            <SimpleCatalogEditor
              title="Languages catalog"
              description="Languages people can pick from when listing their language skills on their profile."
              placeholder="New language name…"
              items={languages}
              onAdd={handleAddLanguage}
              onRemove={handleRemoveLanguage}
              readOnly={!canEditMasterData}
            />
          </TabsContent>
          )}

          {canViewMasterData && (
          <TabsContent value="data" className="mt-4">
            <Card className="border-destructive/30 p-6 shadow-elevation-1">
              <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-destructive">
                <TriangleAlert className="size-4" /> Danger zone
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                This app&apos;s demo data lives entirely in this browser — every person, project, and edit
                is saved locally, not on a shared server. Regenerating the app&apos;s seed dataset never
                reaches back into a browser that&apos;s already loaded it before, so a session can drift out
                of sync over time (e.g. someone showing up in a project&apos;s team list who was never
                actually staffed in its planning dialog). If that happens, reset this browser&apos;s copy
                back to the current seed data below.
              </p>
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="destructive" className="mt-4" disabled={!canEditMasterData} />}
                >
                  <Trash2 className="size-3.5" /> Reset to fresh demo data
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset to fresh demo data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently clears every person, project, and edit stored in this browser and
                      reloads with the current seed dataset. This can&apos;t be undone, and it only affects
                      this browser — nobody else&apos;s data is touched.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleResetDemoData}>
                      Reset data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          </TabsContent>
          )}

          {canViewUsers && (
          <TabsContent value="users" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">User management</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every registration starts as a User. Promote people to Management or Admin here — this stands in
                for real role assignment once the company SSO is wired up. Deleting a user removes their account
                only; their profile, skills and project history stay intact.
              </p>

              <Table className="mt-5">
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-44">Role</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...people]
                    .sort((a, b) => fullName(a).localeCompare(fullName(b)))
                    .map((person) => {
                      const user = users.find((u) => u.personId === person.id);
                      const currentRole = user?.role ?? "user";
                      return (
                        <TableRow key={person.id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-7">
                                <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                                <AvatarFallback className="text-[10px]">{initials(person)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{fullName(person)}</p>
                                <p className="truncate text-xs text-muted-foreground">{person.jobTitle}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user?.email ?? "—"}</TableCell>
                          <TableCell>
                            {!user ? (
                              <span className="text-sm text-muted-foreground italic">No account</span>
                            ) : canEditUsers ? (
                              <Select
                                value={currentRole}
                                onValueChange={(v) => v && handleChangePersonRole(person.id, v as AppRole)}
                              >
                                <SelectTrigger size="sm" className="w-full">
                                  <SelectValue>{ROLE_LABEL[currentRole]}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {ROLE_LABEL[r]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground">{ROLE_LABEL[currentRole]}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {canEditUsers && user && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveUser(person.id, fullName(person))}
                                aria-label={`Delete ${fullName(person)}'s account`}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {people.length === 0 && <p className="py-3 text-sm text-muted-foreground">No people yet.</p>}
            </Card>
          </TabsContent>
          )}

          {canViewPermissions && (
          <TabsContent value="permissions" className="mt-4">
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Permissions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                For each area of the app, choose what each role can do — hidden entirely, view-only, or able to
                edit.
              </p>

              <Table className="mt-5">
                <TableHeader>
                  <TableRow>
                    <TableHead>Function</TableHead>
                    {ROLE_OPTIONS.map((r) => (
                      <TableHead key={r} className="w-44">
                        {ROLE_LABEL[r]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {APP_FUNCTIONS.map((fn) => (
                    <TableRow key={fn.key}>
                      <TableCell>
                        <p className="text-sm font-medium">{fn.label}</p>
                        <p className="text-xs text-muted-foreground">{fn.description}</p>
                      </TableCell>
                      {ROLE_OPTIONS.map((r) => {
                        const level = getPermission(permissions, fn.key, r);
                        const locked = fn.key === "admin-permissions" && r === "admin";
                        const disabled = locked || !canEditPermissions;
                        return (
                          <TableCell key={r}>
                            <Select
                              value={level}
                              onValueChange={(v) => v && handleChangePermission(fn.key, r, v as PermissionLevel)}
                              disabled={disabled}
                            >
                              <SelectTrigger size="sm" className="w-full">
                                <SelectValue>{PERMISSION_LEVEL_LABEL[level]}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {PERMISSION_LEVEL_OPTIONS.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl}>
                                    {PERMISSION_LEVEL_LABEL[lvl]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {locked && <p className="mt-1 text-[11px] text-muted-foreground">Always available to Admins</p>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </RoleGate>
  );
}
