"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { fullName, initials } from "@/lib/data/queries";
import { getHorizonMonths, formatMonthLabel, ALLOCATION_STATUS_LABEL, ALLOCATION_STATUS_STYLES } from "@/lib/data/capacity";
import { selectLabel } from "@/lib/select-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AllocationCell } from "./allocation-cell";
import { DEPARTMENTS, type AllocationStatus } from "@/lib/types";

const WINDOW_SIZE = 6;

export function ResourcePlanningView() {
  const people = useAppStore((s) => s.people);
  const locations = useAppStore((s) => s.locations);
  const projects = useAppStore((s) => s.projects);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);

  const [query, setQuery] = useState("");
  const [locationId, setLocationId] = useState("");
  const [department, setDepartment] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const horizon = getHorizonMonths(12);
  const visibleMonths = horizon.slice(monthOffset, monthOffset + WINDOW_SIZE);
  const locationOptions = [{ value: "any", label: "All locations" }, ...locations.map((l) => ({ value: l.id, label: l.city }))];
  const departmentOptions = [{ value: "any", label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))];

  const visiblePeople = people.filter((p) => {
    if (query && !`${fullName(p)} ${p.jobTitle}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (locationId && p.locationId !== locationId) return false;
    if (department && p.department !== department) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or role…" className="w-[220px]" />
          <Select value={locationId || "any"} onValueChange={(v) => setLocationId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue>{selectLabel(locationOptions, "Location")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((o) => (
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
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
            {(Object.keys(ALLOCATION_STATUS_LABEL) as AllocationStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-2 rounded-full ${ALLOCATION_STATUS_STYLES[status].dot}`} />
                {ALLOCATION_STATUS_LABEL[status]}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthOffset((o) => Math.max(0, o - WINDOW_SIZE))}
            disabled={monthOffset === 0}
          >
            <ChevronLeft /> Previous 6 months
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            {formatMonthLabel(visibleMonths[0], { month: "long", year: "numeric" })} –{" "}
            {formatMonthLabel(visibleMonths[visibleMonths.length - 1], { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthOffset((o) => Math.min(horizon.length - WINDOW_SIZE, o + WINDOW_SIZE))}
            disabled={monthOffset + WINDOW_SIZE >= horizon.length}
          >
            Next 6 months <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-1">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[220px]" />
              {visibleMonths.map((month) => (
                <col key={month} className="w-[150px]" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 border-b border-border bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Person
                </th>
                {visibleMonths.map((month) => (
                  <th
                    key={month}
                    className="sticky top-0 z-10 border-b border-l border-border bg-card px-1 py-2 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {formatMonthLabel(month)}
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
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {person.jobTitle} · {person.department}
                        </span>
                      </span>
                    </Link>
                  </td>
                  {visibleMonths.map((month) => (
                    <td
                      key={month}
                      className="border-b border-l border-border/70 p-1 align-top group-hover:bg-secondary/50"
                    >
                      <AllocationCell person={person} month={month} allocations={resourceAllocations} projects={projects} />
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
