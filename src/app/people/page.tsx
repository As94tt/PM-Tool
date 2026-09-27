"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, X, Users2, FileText, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { useCurrentPerson, useCanEditFunction } from "@/store/hooks";
import { RoleGate } from "@/components/shared/role-gate";
import {
  filterPeople,
  getPersonSkillDetails,
  getPersonCertificationDetails,
  getPersonProjectsSplit,
  fullName,
  type PeopleFilters,
} from "@/lib/data/queries";
import { getAllocationForPersonMonth, getHorizonMonths } from "@/lib/data/capacity";
import { selectLabel } from "@/lib/select-utils";
import { PersonCard } from "@/components/people/person-card";
import { PersonFormSheet } from "@/components/people/person-form-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, type SkillLevel, type Department } from "@/lib/types";

const AVAILABILITY_OPTIONS = [
  { label: "Any availability", value: "0" },
  { label: "20%+ available", value: "20" },
  { label: "40%+ available", value: "40" },
  { label: "60%+ available", value: "60" },
  { label: "80%+ available", value: "80" },
  { label: "Fully available", value: "100" },
];

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeoplePageInner />
    </Suspense>
  );
}

function PeoplePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const canEdit = useCanEditFunction("people-other");
  const people = useAppStore((s) => s.people);
  const personSkills = useAppStore((s) => s.personSkills);
  const personCertifications = useAppStore((s) => s.personCertifications);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const projects = useAppStore((s) => s.projects);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const locations = useAppStore((s) => s.locations);
  const industries = useAppStore((s) => s.industries);
  const skills = useAppStore((s) => s.skills);
  const certifications = useAppStore((s) => s.certifications);
  const currentPerson = useCurrentPerson();

  const [proposalMode, setProposalMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [locationId, setLocationId] = useState(searchParams.get("location") ?? "");
  const [department, setDepartment] = useState(searchParams.get("department") ?? "");
  const [industryId, setIndustryId] = useState(searchParams.get("industry") ?? "");
  const [skillId, setSkillId] = useState(searchParams.get("skill") ?? "");
  const [minLevel, setMinLevel] = useState(searchParams.get("level") ?? "");
  const [certificationId, setCertificationId] = useState(searchParams.get("certification") ?? "");
  const [minAvailability, setMinAvailability] = useState(searchParams.get("availability") ?? "0");

  const filters: PeopleFilters = {
    query: query || undefined,
    locationId: locationId || undefined,
    department: (department as Department) || undefined,
    industryId: industryId || undefined,
    skillId: skillId || undefined,
    minSkillLevel: skillId && minLevel ? (Number(minLevel) as SkillLevel) : undefined,
    certificationId: certificationId || undefined,
    minAvailabilityPercent: minAvailability !== "0" ? Number(minAvailability) : undefined,
  };

  const results = useMemo(
    () =>
      filterPeople({
        people,
        personSkills,
        personCertifications,
        projectMembers,
        resourceAllocations,
        filters,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [people, personSkills, personCertifications, projectMembers, resourceAllocations, query, locationId, department, industryId, skillId, minLevel, certificationId, minAvailability]
  );

  const month = getHorizonMonths(1)[0];
  const hasActiveFilters = Boolean(query || locationId || department || industryId || skillId || certificationId || minAvailability !== "0");

  function toggleProposalMode() {
    setProposalMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(personId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  async function handleGenerateProposal() {
    const chosen = people.filter((p) => selectedIds.has(p.id));
    if (chosen.length === 0) return;
    setGenerating(true);
    try {
      const { downloadStaffingProposal } = await import("@/lib/pdf/staffing-proposal");
      const data = chosen.map((person) => {
        const { current, upcoming, previous } = getPersonProjectsSplit(projectMembers, projects, person.id);
        const relevantProjects = [...current, ...upcoming, ...previous].slice(0, 3).map((project) => {
          const membership = projectMembers.find((m) => m.personId === person.id && m.projectId === project.id);
          return {
            name: project.name,
            clientName: project.clientName,
            roleOnProject: membership?.roleOnProject ?? "Team Member",
            description: project.shortDescription,
          };
        });
        return {
          person,
          location: locations.find((l) => l.id === person.locationId),
          skills: getPersonSkillDetails(personSkills, skills, person.id).map((s) => ({ name: s.skill.name, level: s.level })),
          certifications: getPersonCertificationDetails(personCertifications, certifications, person.id).map((c) => ({
            name: c.certification.name,
            issuer: c.certification.issuer,
          })),
          industries: industries.filter((i) => person.industryExperienceIds.includes(i.id)).map((i) => i.name),
          projects: relevantProjects,
        };
      });
      await downloadStaffingProposal(data, fullName(currentPerson));
      toast.success(`Staffing proposal generated for ${chosen.length} ${chosen.length === 1 ? "person" : "people"}`);
      toggleProposalMode();
    } catch {
      toast.error("Couldn't generate the PDF — please try again");
    } finally {
      setGenerating(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setLocationId("");
    setDepartment("");
    setIndustryId("");
    setSkillId("");
    setMinLevel("");
    setCertificationId("");
    setMinAvailability("0");
    router.replace("/people");
  }

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, typeof skills>();
    for (const s of skills) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return map;
  }, [skills]);

  const locationOptions = [{ value: "any", label: "All locations" }, ...locations.map((l) => ({ value: l.id, label: l.city }))];
  const departmentOptions = [
    { value: "any", label: "All departments" },
    ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
  ];
  const industryOptions = [
    { value: "any", label: "All industries" },
    ...industries.map((i) => ({ value: i.id, label: i.name })),
  ];
  const skillOptions = [{ value: "any", label: "Any skill" }, ...skills.map((s) => ({ value: s.id, label: s.name }))];
  const levelOptions = [1, 2, 3, 4, 5].map((lvl) => ({ value: String(lvl), label: `Level ${lvl}+` }));
  const certificationOptions = [
    { value: "any", label: "Any certification" },
    ...certifications.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <RoleGate functionKey="people-other">
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">People</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find colleagues by skill, role, location or availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={proposalMode ? "secondary" : "outline"} onClick={toggleProposalMode}>
            <FileText className="size-4" /> {proposalMode ? "Cancel selection" : "Create Staffing Proposal"}
          </Button>
          {canEdit && <PersonFormSheet />}
        </div>
      </div>

      {proposalMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">{selectedIds.size}</span> {selectedIds.size === 1 ? "person" : "people"} selected
            — click cards below to add or remove them.
          </p>
          <Button size="sm" onClick={handleGenerateProposal} disabled={selectedIds.size === 0 || generating}>
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
            {generating ? "Generating…" : "Generate PDF"}
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or job title…"
            className="pl-9"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={locationId || "any"} onValueChange={(v) => setLocationId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue placeholder="Location">{selectLabel(locationOptions, "Location")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={department || "any"} onValueChange={(v) => setDepartment(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Department">{selectLabel(departmentOptions, "Department")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={industryId || "any"} onValueChange={(v) => setIndustryId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Industry experience">{selectLabel(industryOptions, "Industry experience")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All industries</SelectItem>
              {industries.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={skillId || "any"}
            onValueChange={(v) => {
              setSkillId(v && v !== "any" ? v : "");
              if (!v || v === "any") setMinLevel("");
            }}
          >
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue placeholder="Skill">{selectLabel(skillOptions, "Skill")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any skill</SelectItem>
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

          {skillId && (
            <Select value={minLevel || "1"} onValueChange={(v) => setMinLevel(v ?? "1")}>
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue placeholder="Min level">{selectLabel(levelOptions, "Min level")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <SelectItem key={lvl} value={String(lvl)}>
                    Level {lvl}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={certificationId || "any"} onValueChange={(v) => setCertificationId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[190px]">
              <SelectValue placeholder="Certification">{selectLabel(certificationOptions, "Certification")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any certification</SelectItem>
              {certifications.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={minAvailability} onValueChange={(v) => setMinAvailability(v ?? "0")}>
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue placeholder="Availability">{selectLabel(AVAILABILITY_OPTIONS, "Availability")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X /> Clear filters
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "person" : "people"} found
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <Users2 className="size-8 text-muted-foreground" />
          <div>
            <p className="font-heading text-lg font-semibold">No matches</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting or clearing your filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((person) => {
            const topSkills = getPersonSkillDetails(personSkills, skills, person.id);
            const certs = getPersonCertificationDetails(personCertifications, certifications, person.id);
            const allocated = getAllocationForPersonMonth(resourceAllocations, person.id, month);
            return (
              <PersonCard
                key={person.id}
                person={person}
                location={locations.find((l) => l.id === person.locationId)}
                topSkills={topSkills}
                certificationCount={certs.length}
                availabilityPercent={Math.max(0, 100 - allocated)}
                selectable={proposalMode}
                selected={selectedIds.has(person.id)}
                onToggleSelect={() => toggleSelected(person.id)}
              />
            );
          })}
        </div>
      )}
    </div>
    </RoleGate>
  );
}
