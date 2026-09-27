"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import {
  fullName,
  initials,
  getProjectMemberDetails,
  getPersonWeeklyAllocationForProject,
} from "@/lib/data/queries";
import { getProjectChartMonths, getAllocationForPersonMonth, formatMonthLabel } from "@/lib/data/capacity";
import { getProjectChartWeeks, formatWeekLabel } from "@/lib/data/week-planning";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AllocationHeatmapRow, AllocationHeatmapLegend } from "@/components/charts/allocation-heatmap";
import { ProjectPlanningDialog } from "@/components/projects/project-planning-dialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type Granularity = "month" | "week";

const WINDOW_SIZE: Record<Granularity, number> = { month: 12, week: 8 };

export function TeamAllocationCard({ project, canSeeBudget }: { project: Project; canSeeBudget: boolean }) {
  const people = useAppStore((s) => s.people);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const projectRoleRequirements = useAppStore((s) => s.projectRoleRequirements);
  const projectRoleAssignments = useAppStore((s) => s.projectRoleAssignments);

  const [granularity, setGranularity] = useState<Granularity>("month");
  const [offset, setOffset] = useState(0);

  const members = getProjectMemberDetails(projectMembers, people, project.id);

  const allMonths = useMemo(
    () => getProjectChartMonths(project.startDate, project.endDate, resourceAllocations, project.id),
    [project.startDate, project.endDate, resourceAllocations, project.id]
  );
  const allWeeks = useMemo(
    () => getProjectChartWeeks(project.startDate, project.endDate, projectRoleRequirements, project.id),
    [project.startDate, project.endDate, projectRoleRequirements, project.id]
  );

  const allPeriods = granularity === "month" ? allMonths : allWeeks;
  const windowSize = WINDOW_SIZE[granularity];
  const visiblePeriods = allPeriods.slice(offset, offset + windowSize);
  const canGoBack = offset > 0;
  const canGoForward = offset + windowSize < allPeriods.length;

  function switchGranularity(g: Granularity) {
    if (g === granularity) return;
    setGranularity(g);
    setOffset(0);
  }

  function step(dir: -1 | 1) {
    setOffset((o) => Math.max(0, Math.min(allPeriods.length - windowSize, o + dir * windowSize)));
  }

  const formatPeriodLabel = (key: string) =>
    granularity === "month" ? formatMonthLabel(key, { month: "short" }) : formatWeekLabel(key);

  return (
    <Card className="p-6 shadow-elevation-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold">
          <Users className="size-4" /> Team & resource allocation
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <AllocationHeatmapLegend />
          <div className="flex items-center rounded-lg border border-border p-0.5">
            {(["month", "week"] as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => switchGranularity(g)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  granularity === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {g === "month" ? "Monthly" : "Weekly"}
              </button>
            ))}
          </div>
          {canSeeBudget && <ProjectPlanningDialog project={project} />}
        </div>
      </div>

      {allPeriods.length > windowSize && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-2 py-1.5">
          <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} disabled={!canGoBack} aria-label="Previous period">
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-[11px] font-medium text-muted-foreground">
            {formatPeriodLabel(visiblePeriods[0])} – {formatPeriodLabel(visiblePeriods[visiblePeriods.length - 1])}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => step(1)} disabled={!canGoForward} aria-label="Next period">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      {visiblePeriods.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
          <div className="size-9 shrink-0" />
          <div className="w-32 shrink-0" />
          <div className="flex min-w-0 flex-1 gap-[2px]">
            {visiblePeriods.map((p, i) => (
              <span key={p} className="flex-1 text-center">
                {granularity === "month" ? (i % 2 === 0 ? formatPeriodLabel(p) : "") : formatPeriodLabel(p)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-1 flex flex-col divide-y divide-border/70">
        {members.map(({ person, roleOnProject }) => {
          const chartData = visiblePeriods.map((p) => ({
            key: p,
            label: formatPeriodLabel(p),
            value:
              granularity === "month"
                ? getAllocationForPersonMonth(resourceAllocations, person.id, p)
                : getPersonWeeklyAllocationForProject(projectRoleRequirements, projectRoleAssignments, person.id, project.id, p),
          }));
          return (
            <Link
              key={person.id}
              href={`/people/${person.id}`}
              className="flex items-center gap-3 py-3 transition-colors hover:bg-secondary/50"
            >
              <Avatar className="size-9">
                <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                <AvatarFallback>{initials(person)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 w-32 shrink-0">
                <p className="truncate text-sm font-medium">{fullName(person)}</p>
                <p className="truncate text-xs text-muted-foreground">{roleOnProject}</p>
              </div>
              <AllocationHeatmapRow data={chartData} />
            </Link>
          );
        })}
        {members.length === 0 && <p className="py-3 text-sm text-muted-foreground">No team members yet.</p>}
      </div>
    </Card>
  );
}
