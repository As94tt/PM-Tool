"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { UserX } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { fullName, initials, getBenchPeople } from "@/lib/data/queries";
import {
  getHorizonMonths,
  formatMonthLabel,
  getAllocationForPersonMonth,
  getAllocationStatus,
  ALLOCATION_STATUS_LABEL,
  ALLOCATION_STATUS_STYLES,
} from "@/lib/data/capacity";
import { selectLabel } from "@/lib/select-utils";
import { PROJECT_STATUS_LABEL, SECURE_ALLOCATION_STATUSES } from "@/lib/project-status";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, type AllocationStatus, type Project, type ResourceAllocation } from "@/lib/types";

const UNDERALLOCATED_THRESHOLD = 75;

/** Diagonal hatch, tone-on-white so it reads consistently over any of the
 * four alloc-status fill colors instead of needing a second hue per status
 * (which is exactly the "color on color" clash a plain second color would
 * risk). Marks a cell whose allocation includes at least one project that
 * isn't yet a firm commitment (see SECURE_ALLOCATION_STATUSES) — magnitude
 * still reads purely from the base fill color; texture is the only signal
 * for certainty. */
const UNCERTAIN_HATCH_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 2px, transparent 2px, transparent 7px)",
};

/** Read-only — shows which project(s) make up a person's allocation for a
 * month. No add/remove controls; edit allocations from a project's own
 * planning dialog instead. */
function AllocationDetailCell({
  person,
  month,
  allocations,
  projects,
}: {
  person: { id: string; };
  month: string;
  allocations: ResourceAllocation[];
  projects: Project[];
}) {
  const rows = allocations.filter((a) => a.personId === person.id && a.month === month);
  const total = rows.reduce((sum, r) => sum + r.allocationPercent, 0);
  const styles = ALLOCATION_STATUS_STYLES[getAllocationStatus(total)];
  const rowsWithProject = rows.map((r) => ({ row: r, project: projects.find((p) => p.id === r.projectId) }));
  const hasUncertainAllocation = rowsWithProject.some(
    ({ project }) => project && !SECURE_ALLOCATION_STATUSES.includes(project.status)
  );

  if (total === 0) {
    return <div className="flex h-8 w-full items-center justify-center text-xs text-border">–</div>;
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            style={hasUncertainAllocation ? UNCERTAIN_HATCH_STYLE : undefined}
            title={hasUncertainAllocation ? "Includes allocation on a project that isn't yet a signed commitment" : undefined}
            className={cn(
              "flex h-8 w-full items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-opacity hover:opacity-80",
              styles.bar
            )}
          >
            {total}%
          </button>
        }
      />
      <PopoverContent className="w-64" align="center">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">{formatMonthLabel(month, { month: "long", year: "numeric" })}</p>
          <span
            style={hasUncertainAllocation ? UNCERTAIN_HATCH_STYLE : undefined}
            className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles.badge)}
          >
            {total}%
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {rowsWithProject.map(({ row: r, project }) => {
            const isSecure = !project || SECURE_ALLOCATION_STATUSES.includes(project.status);
            const rowStyles = ALLOCATION_STATUS_STYLES[getAllocationStatus(r.allocationPercent)];
            return (
              <Link
                key={r.id}
                href={`/projects/${r.projectId}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary/50"
              >
                <span className="min-w-0 flex-1 truncate">{project?.name ?? "Unknown project"}</span>
                {!isSecure && (
                  <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
                    {project ? PROJECT_STATUS_LABEL[project.status] : "uncertain"}
                  </span>
                )}
                <span
                  style={!isSecure ? UNCERTAIN_HATCH_STYLE : undefined}
                  className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", rowStyles.badge)}
                >
                  {r.allocationPercent}%
                </span>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ResourcePlanningView() {
  const people = useAppStore((s) => s.people);
  const locations = useAppStore((s) => s.locations);
  const projects = useAppStore((s) => s.projects);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);

  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [department, setDepartment] = useState("");
  const [underallocatedOnly, setUnderallocatedOnly] = useState(false);

  const horizon = getHorizonMonths(12);
  const countries = Array.from(new Set(locations.map((l) => l.country))).toSorted();
  const countryOptions = [{ value: "any", label: "All locations" }, ...countries.map((c) => ({ value: c, label: c }))];
  const departmentOptions = [{ value: "any", label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))];
  const bench = getBenchPeople(people, resourceAllocations);

  const visiblePeople = people.filter((p) => {
    if (query && !`${fullName(p)} ${p.jobTitle}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (country && locations.find((l) => l.id === p.locationId)?.country !== country) return false;
    if (department && p.department !== department) return false;
    if (underallocatedOnly) {
      const isOrWillBeUnderallocated = horizon.some(
        (month) => getAllocationForPersonMonth(resourceAllocations, p.id, month) < UNDERALLOCATED_THRESHOLD
      );
      if (!isOrWillBeUnderallocated) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Read-only summary of monthly allocation, rolled up from each project&apos;s own resource & budget plan.
        Click a cell to see which project(s) it comes from — edit allocations from a project&apos;s planning
        dialog instead.
      </p>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or role…" className="w-[220px]" />
          <Select value={country || "any"} onValueChange={(v) => setCountry(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[160px]">
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
          <label className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground">
            <Switch checked={underallocatedOnly} onCheckedChange={(v) => setUnderallocatedOnly(v === true)} size="sm" />
            Underallocated only
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
            {(Object.keys(ALLOCATION_STATUS_LABEL) as AllocationStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-2 rounded-full ${ALLOCATION_STATUS_STYLES[status].dot}`} />
                {ALLOCATION_STATUS_LABEL[status]}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-alloc-full" style={UNCERTAIN_HATCH_STYLE} />
              Not yet secure
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-1">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[190px]" />
              {horizon.map((month) => (
                <col key={month} className="w-[75px]" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 border-b border-border bg-card px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                  Person
                </th>
                {horizon.map((month) => (
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
                  <td className="sticky left-0 z-10 border-b border-border bg-card px-3 py-2 group-hover:bg-secondary/50">
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
                  {horizon.map((month) => (
                    <td key={month} className="border-b border-l border-border/70 p-1 group-hover:bg-secondary/50">
                      <AllocationDetailCell person={person} month={month} allocations={resourceAllocations} projects={projects} />
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

      <Card className="p-5 shadow-elevation-1">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
          <UserX className="size-4" /> Bench — not allocated this month ({bench.length})
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">People with zero allocation across all projects this month.</p>
        {bench.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Everyone is allocated to a project this month.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {bench.map(({ person }) => (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
              >
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
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
