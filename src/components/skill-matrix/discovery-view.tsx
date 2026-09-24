"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { discoverPeopleBySkill, fullName, initials } from "@/lib/data/queries";
import { selectLabel } from "@/lib/select-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkillLevelDots } from "@/components/shared/skill-level";
import { getAllocationStatus, ALLOCATION_STATUS_STYLES } from "@/lib/data/capacity";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, type SkillLevel } from "@/lib/types";

export function DiscoveryView({
  skillId,
  setSkillId,
  minLevel,
  setMinLevel,
  minAvailability,
  setMinAvailability,
}: {
  skillId: string;
  setSkillId: (v: string) => void;
  minLevel: number;
  setMinLevel: (v: number) => void;
  minAvailability: number;
  setMinAvailability: (v: number) => void;
}) {
  const [department, setDepartment] = useState("");
  const skills = useAppStore((s) => s.skills);
  const people = useAppStore((s) => s.people);
  const personSkills = useAppStore((s) => s.personSkills);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const projects = useAppStore((s) => s.projects);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const locations = useAppStore((s) => s.locations);

  const skillsByCategory = new Map<string, typeof skills>();
  for (const s of skills) {
    const list = skillsByCategory.get(s.category) ?? [];
    list.push(s);
    skillsByCategory.set(s.category, list);
  }

  const skillOptions = [{ value: "any", label: "Choose a skill…" }, ...skills.map((s) => ({ value: s.id, label: s.name }))];
  const levelOptions = [1, 2, 3, 4, 5].map((l) => ({ value: String(l), label: `Level ${l}+` }));
  const availabilityOptions = [0, 20, 40, 60, 80, 100].map((a) => ({
    value: String(a),
    label: a === 0 ? "Any availability" : `${a}%+ available`,
  }));
  const departmentOptions = [{ value: "any", label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))];

  const results = (
    skillId
      ? discoverPeopleBySkill({
          people,
          personSkills,
          projectMembers,
          projects,
          resourceAllocations,
          skillId,
          minLevel: minLevel as SkillLevel,
          minAvailabilityPercent: minAvailability,
        })
      : []
  ).filter((r) => !department || r.person.department === department);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={skillId || "any"} onValueChange={(v) => setSkillId(v && v !== "any" ? v : "")}>
            <SelectTrigger className="w-[220px]">
              <SelectValue>{selectLabel(skillOptions, "Choose a skill…")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.from(skillsByCategory.entries()).map(([category, items]) => (
                <div key={category}>
                  {items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(minLevel)} onValueChange={(v) => v && setMinLevel(Number(v))}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue>{selectLabel(levelOptions, "Min level")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(minAvailability)} onValueChange={(v) => v && setMinAvailability(Number(v))}>
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue>{selectLabel(availabilityOptions, "Availability")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availabilityOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={department || "any"} onValueChange={(v) => setDepartment(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue>{selectLabel(departmentOptions, "Department")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!skillId ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <Search className="size-8 text-muted-foreground" />
          <div>
            <p className="font-heading text-lg font-semibold">Find the right expert</p>
            <p className="mt-1 text-sm text-muted-foreground">Choose a skill above to see who has it.</p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="font-heading text-lg font-semibold">No matches</p>
          <p className="mt-1 text-sm text-muted-foreground">Try lowering the minimum level or availability.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "person matches" : "people match"}
          </p>
          {results.map(({ person, level, availabilityPercent, relevantProjects }) => {
            const location = locations.find((l) => l.id === person.locationId);
            const status = getAllocationStatus(100 - availabilityPercent);
            const styles = ALLOCATION_STATUS_STYLES[status];
            return (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-elevation-1 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2 sm:flex-row sm:items-center"
              >
                <Avatar className="size-11">
                  <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                  <AvatarFallback>{initials(person)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fullName(person)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.jobTitle}
                    {location ? ` · ${location.city}` : ""} · {person.department}
                  </p>
                  {relevantProjects.length > 0 && (
                    <p className="mt-1 truncate text-xs text-muted-foreground/80">
                      On: {relevantProjects.map((p) => p.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SkillLevelDots level={level} />
                  <span className="text-xs text-muted-foreground">Level {level}</span>
                </div>
                <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", styles.badge)}>
                  <span className={cn("size-1.5 rounded-full", styles.dot)} />
                  {availabilityPercent}% free
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
