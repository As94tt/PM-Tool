"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/app-store-provider";
import {
  getPersonSkillDetails,
  getPersonCertificationDetails,
} from "@/lib/data/queries";
import { Input } from "@/components/ui/input";
import { SKILL_LEVEL_LABEL } from "@/components/shared/skill-level";
import { selectLabel } from "@/lib/select-utils";
import { groupBy } from "@/lib/utils";
import {
  DEPARTMENTS,
  LANGUAGE_PROFICIENCIES,
  type Department,
  type LanguageProficiency,
  type Person,
  type SkillLevel,
} from "@/lib/types";

const ROLE_SUGGESTIONS = [
  "Project Lead",
  "Solution Architect",
  "Lead Developer",
  "Business Analyst",
  "QA Engineer",
  "Data Engineer",
  "UX Designer",
  "DevOps Engineer",
  "Consultant",
];

export function EditProfileSheet({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);

  const skills = useAppStore((s) => s.skills);
  const certifications = useAppStore((s) => s.certifications);
  const interests = useAppStore((s) => s.interests);
  const industries = useAppStore((s) => s.industries);
  const locations = useAppStore((s) => s.locations);
  const roles = useAppStore((s) => s.roles);
  const languages = useAppStore((s) => s.languages);
  const personSkills = useAppStore((s) => s.personSkills);
  const personCertifications = useAppStore((s) => s.personCertifications);
  const projects = useAppStore((s) => s.projects);
  const projectMembers = useAppStore((s) => s.projectMembers);

  const updatePerson = useAppStore((s) => s.updatePerson);
  const setPersonSkillLevel = useAppStore((s) => s.setPersonSkillLevel);
  const removePersonSkill = useAppStore((s) => s.removePersonSkill);
  const addPersonCertification = useAppStore((s) => s.addPersonCertification);
  const removePersonCertification = useAppStore((s) => s.removePersonCertification);
  const addProjectMembership = useAppStore((s) => s.addProjectMembership);
  const removeProjectMembership = useAppStore((s) => s.removeProjectMembership);
  const updateProjectMemberContribution = useAppStore((s) => s.updateProjectMemberContribution);

  const [firstName, setFirstName] = useState(person.firstName);
  const [lastName, setLastName] = useState(person.lastName);
  const [bio, setBio] = useState(person.bio);
  const [addSkillId, setAddSkillId] = useState("");
  const [addSkillLevel, setAddSkillLevel] = useState("3");
  const [addCertId, setAddCertId] = useState("");
  const [addProjectId, setAddProjectId] = useState("");
  const [expandedContributionIds, setExpandedContributionIds] = useState<Set<string>>(new Set());
  const [contributionDrafts, setContributionDrafts] = useState<Record<string, string>>({});
  const [addProjectRole, setAddProjectRole] = useState("");
  const [newStrength, setNewStrength] = useState("");
  const [newLanguageName, setNewLanguageName] = useState("");
  const [newLanguageProficiency, setNewLanguageProficiency] = useState<LanguageProficiency>("Professional");

  const mySkills = getPersonSkillDetails(personSkills, skills, person.id);
  const myCerts = getPersonCertificationDetails(personCertifications, certifications, person.id);
  const availableSkills = skills.filter((s) => !mySkills.some((ms) => ms.skill.id === s.id));
  const availableCerts = certifications.filter((c) => !myCerts.some((mc) => mc.certification.id === c.id));

  const skillsByCategory = groupBy(availableSkills, (s) => s.category);

  const levelDetailOptions = [1, 2, 3, 4, 5].map((lvl) => ({
    value: String(lvl),
    label: `${lvl} · ${SKILL_LEVEL_LABEL[lvl as SkillLevel]}`,
  }));
  const levelShortOptions = [1, 2, 3, 4, 5].map((lvl) => ({ value: String(lvl), label: `Lvl ${lvl}` }));
  const addSkillOptions = [{ value: "none", label: "Select a skill" }, ...availableSkills.map((s) => ({ value: s.id, label: s.name }))];
  const addCertOptions = [
    { value: "none", label: "Select a certification" },
    ...availableCerts.map((c) => ({ value: c.id, label: c.name })),
  ];

  const myMemberships = projectMembers
    .filter((m) => m.personId === person.id)
    .map((m) => {
      const project = projects.find((p) => p.id === m.projectId);
      return project
        ? { project, roleOnProject: m.roleOnProject, contributionDescription: m.contributionDescription }
        : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const availableProjectsForAdd = projects.filter(
    (p) => !myMemberships.some((m) => m.project.id === p.id)
  );
  const addProjectOptions = [
    { value: "none", label: "Select a project" },
    ...availableProjectsForAdd.map((p) => ({ value: p.id, label: p.name })),
  ];
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.city }));
  const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }));
  const availableLanguages = languages.filter(
    (l) => !person.languages.some((pl) => pl.name.toLowerCase() === l.name.toLowerCase())
  );
  const languageOptions = [
    { value: "none", label: "Select a language" },
    ...availableLanguages.map((l) => ({ value: l.name, label: l.name })),
  ];

  function saveBasics() {
    const patch: Partial<Person> = {};
    if (firstName.trim() && firstName !== person.firstName) patch.firstName = firstName.trim();
    if (lastName.trim() && lastName !== person.lastName) patch.lastName = lastName.trim();
    if (Object.keys(patch).length > 0) {
      updatePerson(person.id, patch);
      toast.success("Profile updated");
    }
  }

  function saveBio() {
    if (bio !== person.bio) {
      updatePerson(person.id, { bio });
      toast.success("Bio updated");
    }
  }

  function handleAddSkill() {
    if (!addSkillId) return;
    setPersonSkillLevel(person.id, addSkillId, Number(addSkillLevel) as SkillLevel);
    toast.success("Skill added");
    setAddSkillId("");
    setAddSkillLevel("3");
  }

  function handleAddCert() {
    if (!addCertId) return;
    addPersonCertification({
      personId: person.id,
      certificationId: addCertId,
    });
    toast.success("Certification added");
    setAddCertId("");
  }

  function handleAddProject() {
    if (!addProjectId || !addProjectRole.trim()) return;
    addProjectMembership(person.id, addProjectId, addProjectRole.trim());
    toast.success("Project added");
    setAddProjectId("");
    setAddProjectRole("");
  }

  function toggleContributionEditor(projectId: string, currentValue?: string) {
    setExpandedContributionIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
    setContributionDrafts((prev) => ({ ...prev, [projectId]: prev[projectId] ?? currentValue ?? "" }));
  }

  function saveContribution(projectId: string) {
    const draft = contributionDrafts[projectId] ?? "";
    updateProjectMemberContribution(person.id, projectId, draft.trim());
    toast.success("Project details updated");
  }

  function toggleInterest(id: string) {
    const has = person.interestIds.includes(id);
    updatePerson(person.id, {
      interestIds: has ? person.interestIds.filter((i) => i !== id) : [...person.interestIds, id],
    });
  }

  function toggleIndustry(id: string) {
    const has = person.industryExperienceIds.includes(id);
    updatePerson(person.id, {
      industryExperienceIds: has
        ? person.industryExperienceIds.filter((i) => i !== id)
        : [...person.industryExperienceIds, id],
    });
  }

  function handleAddStrength() {
    const value = newStrength.trim();
    if (!value || person.projectStrengths.some((s) => s.toLowerCase() === value.toLowerCase())) return;
    updatePerson(person.id, { projectStrengths: [...person.projectStrengths, value] });
    setNewStrength("");
  }

  function removeStrength(value: string) {
    updatePerson(person.id, { projectStrengths: person.projectStrengths.filter((s) => s !== value) });
  }

  function handleAddLanguage() {
    const name = newLanguageName.trim();
    if (!name || person.languages.some((l) => l.name.toLowerCase() === name.toLowerCase())) return;
    updatePerson(person.id, { languages: [...person.languages, { name, proficiency: newLanguageProficiency }] });
    setNewLanguageName("");
    setNewLanguageProficiency("Professional");
  }

  function removeLanguage(name: string) {
    updatePerson(person.id, { languages: person.languages.filter((l) => l.name !== name) });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil /> Edit profile
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Changes save immediately and reflect across the Skill Matrix.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100svh-6rem)]">
          <div className="flex flex-col gap-8 px-6 py-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold">Basics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ep-first" className="mb-1.5">
                    First name
                  </Label>
                  <Input
                    id="ep-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={saveBasics}
                  />
                </div>
                <div>
                  <Label htmlFor="ep-last" className="mb-1.5">
                    Last name
                  </Label>
                  <Input
                    id="ep-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={saveBasics}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5">Job title / role</Label>
                  <Select
                    value={person.jobTitle}
                    onValueChange={(v) => v && updatePerson(person.id, { jobTitle: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{selectLabel(roleOptions, "Select a role")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5">Department</Label>
                  <Select
                    value={person.department}
                    onValueChange={(v) => v && updatePerson(person.id, { department: v as Department })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{selectLabel(DEPARTMENTS.map((d) => ({ value: d, label: d })), "Department")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5">Location</Label>
                  <Select
                    value={person.locationId}
                    onValueChange={(v) => v && updatePerson(person.id, { locationId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{selectLabel(locationOptions, "Location")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section>
              <Label htmlFor="bio" className="mb-2">
                Bio
              </Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} onBlur={saveBio} rows={4} />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Projects</h3>
              <div className="flex flex-col gap-2">
                {myMemberships.map(({ project, roleOnProject, contributionDescription }) => {
                  const isExpanded = expandedContributionIds.has(project.id);
                  return (
                    <div key={project.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{project.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{roleOnProject}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs text-muted-foreground"
                          onClick={() => toggleContributionEditor(project.id, contributionDescription)}
                        >
                          {isExpanded ? "Hide" : contributionDescription ? "Edit details" : "Add details"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeProjectMembership(person.id, project.id)}
                          aria-label={`Remove ${project.name}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 border-t border-border/70 pt-2">
                          <Label className="mb-1.5 text-xs text-muted-foreground">
                            What I did on this project (shown on my CV)
                          </Label>
                          <Textarea
                            rows={3}
                            value={contributionDrafts[project.id] ?? contributionDescription ?? ""}
                            onChange={(e) =>
                              setContributionDrafts((prev) => ({ ...prev, [project.id]: e.target.value }))
                            }
                            onBlur={() => saveContribution(project.id)}
                            placeholder="Led requirements workshops, delivered the FHIR integration layer…"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {myMemberships.length === 0 && <p className="text-sm text-muted-foreground">No projects added yet.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Select value={addProjectId || "none"} onValueChange={(v) => setAddProjectId(v && v !== "none" ? v : "")}>
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue placeholder="Add a project…">{selectLabel(addProjectOptions, "Add a project…")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select a project
                    </SelectItem>
                    {availableProjectsForAdd.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  list="epf-role-suggestions"
                  value={addProjectRole}
                  onChange={(e) => setAddProjectRole(e.target.value)}
                  placeholder="Role…"
                  className="w-32"
                />
                <datalist id="epf-role-suggestions">
                  {ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <Button size="sm" onClick={handleAddProject} disabled={!addProjectId || !addProjectRole.trim()}>
                  <Plus />
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Skills</h3>
              <div className="flex flex-col gap-2">
                {mySkills.map(({ skill, level }) => (
                  <div key={skill.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="flex-1 truncate text-sm">{skill.name}</span>
                    <span className="text-xs text-muted-foreground">{SKILL_LEVEL_LABEL[level]}</span>
                    <Select
                      value={String(level)}
                      onValueChange={(v) => v && setPersonSkillLevel(person.id, skill.id, Number(v) as SkillLevel)}
                    >
                      <SelectTrigger size="sm" className="w-[150px]">
                        <SelectValue>{selectLabel(levelDetailOptions, "Level")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {levelDetailOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removePersonSkill(person.id, skill.id)}
                      aria-label={`Remove ${skill.name}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Select value={addSkillId || "none"} onValueChange={(v) => setAddSkillId(v && v !== "none" ? v : "")}>
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue placeholder="Add a skill…">{selectLabel(addSkillOptions, "Add a skill…")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select a skill
                    </SelectItem>
                    {Array.from(skillsByCategory.entries()).map(([category, items]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{category}</SelectLabel>
                        {items.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addSkillLevel} onValueChange={(v) => setAddSkillLevel(v ?? "3")}>
                  <SelectTrigger size="sm" className="w-[90px]">
                    <SelectValue>{selectLabel(levelShortOptions, "Level")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {levelShortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddSkill} disabled={!addSkillId}>
                  <Plus />
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Project strengths</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Short selling points for staffing proposals — e.g. &ldquo;Stakeholder management&rdquo;.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {person.projectStrengths.map((strength) => (
                  <Badge key={strength} variant="secondary" className="gap-1 font-normal">
                    {strength}
                    <button
                      onClick={() => removeStrength(strength)}
                      aria-label={`Remove ${strength}`}
                      className="ml-0.5 rounded-full hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {person.projectStrengths.length === 0 && (
                  <p className="text-sm text-muted-foreground">No strengths added yet.</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={newStrength}
                  onChange={(e) => setNewStrength(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddStrength();
                    }
                  }}
                  placeholder="Add a strength…"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddStrength} disabled={!newStrength.trim()}>
                  <Plus />
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Certifications</h3>
              <div className="flex flex-col gap-2">
                {myCerts.map(({ certification }) => (
                  <div
                    key={certification.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{certification.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{certification.issuer}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removePersonCertification(person.id, certification.id)}
                      aria-label={`Remove ${certification.name}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {myCerts.length === 0 && <p className="text-sm text-muted-foreground">No certifications yet.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Select value={addCertId || "none"} onValueChange={(v) => setAddCertId(v && v !== "none" ? v : "")}>
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue placeholder="Add a certification…">
                      {selectLabel(addCertOptions, "Add a certification…")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select a certification
                    </SelectItem>
                    {availableCerts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddCert} disabled={!addCertId}>
                  <Plus />
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Languages</h3>
              <div className="flex flex-col gap-2">
                {person.languages.map((lang) => (
                  <div key={lang.name} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="flex-1 truncate text-sm">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">{lang.proficiency}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLanguage(lang.name)}
                      aria-label={`Remove ${lang.name}`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {person.languages.length === 0 && <p className="text-sm text-muted-foreground">No languages added yet.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Select
                  value={newLanguageName || "none"}
                  onValueChange={(v) => setNewLanguageName(v && v !== "none" ? v : "")}
                >
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue>{selectLabel(languageOptions, "Select a language")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} disabled={o.value === "none"}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newLanguageProficiency}
                  onValueChange={(v) => v && setNewLanguageProficiency(v as LanguageProficiency)}
                >
                  <SelectTrigger size="sm" className="w-[150px]">
                    <SelectValue>
                      {selectLabel(
                        LANGUAGE_PROFICIENCIES.map((p) => ({ value: p, label: p })),
                        "Proficiency"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_PROFICIENCIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddLanguage} disabled={!newLanguageName.trim()}>
                  <Plus />
                </Button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Interests & hobbies</h3>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest) => {
                  const active = person.interestIds.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                    >
                      <Badge
                        variant={active ? "default" : "secondary"}
                        className="cursor-pointer font-normal"
                      >
                        {interest.name}
                        {active && <X className="size-3" />}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Industry experience</h3>
              <div className="flex flex-wrap gap-1.5">
                {industries.map((industry) => {
                  const active = person.industryExperienceIds.includes(industry.id);
                  return (
                    <button
                      key={industry.id}
                      onClick={() => toggleIndustry(industry.id)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                    >
                      <Badge variant={active ? "default" : "secondary"} className="cursor-pointer font-normal">
                        {industry.name}
                        {active && <X className="size-3" />}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
