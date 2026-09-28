"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/app-store-provider";
import { fullName, initials } from "@/lib/data/queries";
import { getAllocationForPersonMonth, getHorizonMonths } from "@/lib/data/capacity";
import { selectLabel } from "@/lib/select-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkillLevelCell } from "./skill-level-cell";
import { DEPARTMENTS, type SkillCategory, type SkillLevel } from "@/lib/types";

export function MatrixView() {
  const people = useAppStore((s) => s.people);
  const skills = useAppStore((s) => s.skills);
  const personSkills = useAppStore((s) => s.personSkills);
  const locations = useAppStore((s) => s.locations);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);

  const categories = Array.from(new Set(skills.map((s) => s.category))) as SkillCategory[];

  const [category, setCategory] = useState<string>(categories[0] ?? "");
  const [roleQuery, setRoleQuery] = useState("");
  const [country, setCountry] = useState("");
  const [department, setDepartment] = useState("");
  const [minLevel, setMinLevel] = useState(0);
  const [minAvailability, setMinAvailability] = useState(0);

  const visibleSkills = category === "all" ? skills : skills.filter((s) => s.category === category);
  const month = getHorizonMonths(1)[0];

  const levelLookup = useMemo(() => {
    const map = new Map<string, SkillLevel>();
    for (const ps of personSkills) map.set(`${ps.personId}:${ps.skillId}`, ps.level);
    return map;
  }, [personSkills]);

  const visiblePeople = people.filter((p) => {
    if (roleQuery && !`${fullName(p)} ${p.jobTitle}`.toLowerCase().includes(roleQuery.toLowerCase())) return false;
    if (country && locations.find((l) => l.id === p.locationId)?.country !== country) return false;
    if (department && p.department !== department) return false;
    if (minAvailability > 0) {
      const allocated = getAllocationForPersonMonth(resourceAllocations, p.id, month);
      if (100 - allocated < minAvailability) return false;
    }
    if (minLevel > 0) {
      const hasLevel = visibleSkills.some((s) => (levelLookup.get(`${p.id}:${s.id}`) ?? 0) >= minLevel);
      if (!hasLevel) return false;
    }
    return true;
  });

  const categoryOptions = [{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))];
  const countries = Array.from(new Set(locations.map((l) => l.country))).toSorted();
  const countryOptions = [{ value: "any", label: "All locations" }, ...countries.map((c) => ({ value: c, label: c }))];
  const departmentOptions = [{ value: "any", label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))];
  const levelOptions = [
    { value: "0", label: "Any level" },
    ...[1, 2, 3, 4, 5].map((l) => ({ value: String(l), label: `Level ${l}+` })),
  ];
  const availabilityOptions = [
    { value: "0", label: "Any availability" },
    ...[20, 40, 60, 80].map((a) => ({ value: String(a), label: `${a}%+ available` })),
    { value: "100", label: "Fully available" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={roleQuery}
            onChange={(e) => setRoleQuery(e.target.value)}
            placeholder="Search name or role…"
            className="w-[200px]"
          />
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue>{selectLabel(categoryOptions, "Category")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={country || "any"} onValueChange={(v) => setCountry(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue>{selectLabel(countryOptions, "Location")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countryOptions.map((o) => (
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
          <Select value={String(minLevel)} onValueChange={(v) => v && setMinLevel(Number(v))}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue>{selectLabel(levelOptions, "Level")}</SelectValue>
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
          <span className="ml-auto text-xs text-muted-foreground">
            {visiblePeople.length} people × {visibleSkills.length} skills
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-1">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 min-w-[220px] border-b border-border bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Person
                </th>
                {visibleSkills.map((skill) => (
                  <th
                    key={skill.id}
                    className="sticky top-0 z-10 min-w-[64px] border-b border-l border-border bg-card px-1 py-2 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    <span className="line-clamp-2 leading-tight">{skill.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePeople.map((person) => (
                <tr key={person.id} className="group">
                  <td className="sticky left-0 z-10 border-b border-border bg-card px-4 py-2 group-hover:bg-secondary/50">
                    <Link href={`/people/${person.id}`} className="flex items-center gap-2.5 hover:text-primary">
                      <Avatar className="size-7">
                        <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                        <AvatarFallback className="text-[10px]">{initials(person)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{fullName(person)}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{person.jobTitle}</span>
                      </span>
                    </Link>
                  </td>
                  {visibleSkills.map((skill) => (
                    <td
                      key={skill.id}
                      className="border-b border-l border-border/70 px-1 py-1 text-center group-hover:bg-secondary/50"
                    >
                      <div className="flex items-center justify-center">
                        <SkillLevelCell level={levelLookup.get(`${person.id}:${skill.id}`)} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {visiblePeople.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No people match these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
