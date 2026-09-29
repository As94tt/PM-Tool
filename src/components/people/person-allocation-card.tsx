"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import {
  getPersonChartMonths,
  getPersonChartWeeks,
  getPersonWeeklyAllocationForProject,
  getProjectMonthlyAllocationLive,
  getPersonProjectHistory,
} from "@/lib/data/queries";
import { formatMonthLabel } from "@/lib/data/capacity";
import { getWeeksInMonth, formatWeekLabel } from "@/lib/data/week-planning";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AllocationHeatmapRow, AllocationHeatmapLegend } from "@/components/charts/allocation-heatmap";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types";

type Granularity = "month" | "week";

const WINDOW_SIZE: Record<Granularity, number> = { month: 12, week: 8 };
/** Same stretch-to-fill-or-fixed-and-scroll pattern as the project page's
 * own Team & resource allocation card — see that file for the reasoning. */
const MIN_COL_WIDTH: Record<Granularity, number> = { month: 48, week: 64 };
const NAME_COL_WIDTH = 188;
const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 18;
/** Must match the gap-[2px] AllocationHeatmapRow puts between its cells. */
const CELL_GAP = 2;

/**
 * A person's own allocation timeline — one row per project they're a member
 * of, the exact same project set (and roleOnProject label) as the Current/
 * Upcoming/Previous projects sections below on this same page, via the same
 * getPersonProjectHistory call — showing a different set here would just
 * read as a bug (two "which projects is this person on" answers on one
 * page). A shared Monthly/Weekly horizon spans from today (this is a
 * forward-looking timeline, not a historical record) through their latest
 * project's end, or last actually-staffed period if that runs later. The
 * project-page mirror of TeamAllocationCard, with the row axis swapped:
 * projects instead of people, for one person instead of one project.
 */
export function PersonAllocationCard({ person }: { person: Person }) {
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const projectRoleRequirements = useAppStore((s) => s.projectRoleRequirements);
  const projectRoleAssignments = useAppStore((s) => s.projectRoleAssignments);

  const [granularity, setGranularity] = useState<Granularity>("month");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: 0, visibleWidth: 0 });

  const myProjectEntries = useMemo(
    () =>
      getPersonProjectHistory(projectMembers, projects, resourceAllocations, person.id).toSorted((a, b) =>
        a.project.startDate.localeCompare(b.project.startDate)
      ),
    [projectMembers, projects, resourceAllocations, person.id]
  );
  const myProjects = useMemo(() => myProjectEntries.map((e) => e.project), [myProjectEntries]);

  const allMonths = useMemo(
    () => getPersonChartMonths(myProjects, projectRoleRequirements, projectRoleAssignments, person.id),
    [myProjects, projectRoleRequirements, projectRoleAssignments, person.id]
  );
  const allWeeks = useMemo(
    () => getPersonChartWeeks(myProjects, projectRoleRequirements, projectRoleAssignments, person.id),
    [myProjects, projectRoleRequirements, projectRoleAssignments, person.id]
  );

  const allPeriods = granularity === "month" ? allMonths : allWeeks;
  const windowSize = WINDOW_SIZE[granularity];
  const minColWidth = MIN_COL_WIDTH[granularity];
  const gapTotal = Math.max(0, allPeriods.length - 1) * CELL_GAP;
  const naturalWidth = allPeriods.length * minColWidth + gapTotal;
  const colWidth =
    scrollState.visibleWidth > 0 && naturalWidth < scrollState.visibleWidth
      ? (scrollState.visibleWidth - gapTotal) / Math.max(1, allPeriods.length)
      : minColWidth;
  const stripWidth = allPeriods.length * colWidth + gapTotal;
  const maxLeft = Math.max(0, stripWidth - scrollState.visibleWidth);
  const needsScroll = maxLeft > 1;
  const canGoBack = scrollState.left > 1;
  const canGoForward = scrollState.left < maxLeft - 1;

  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setScrollState({ left: el.scrollLeft, visibleWidth: el.clientWidth });
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [allPeriods.length, granularity]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      el!.scrollLeft += delta;
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  function switchGranularity(g: Granularity) {
    if (g === granularity) return;
    setGranularity(g);
    scrollAreaRef.current?.scrollTo({ left: 0 });
  }

  const colPitch = colWidth + CELL_GAP;

  function step(dir: -1 | 1) {
    scrollAreaRef.current?.scrollBy({ left: dir * windowSize * colPitch, behavior: "smooth" });
  }

  const formatPeriodLabel = (key: string) =>
    granularity === "month" ? formatMonthLabel(key, { month: "short", year: "2-digit" }) : formatWeekLabel(key);

  const firstVisibleIdx = Math.min(allPeriods.length - 1, Math.round(scrollState.left / colPitch));
  const visibleCount = Math.max(1, Math.floor(scrollState.visibleWidth / colPitch));
  const lastVisibleIdx = Math.min(allPeriods.length - 1, firstVisibleIdx + visibleCount - 1);

  return (
    <Card className="p-6 shadow-elevation-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold">
          <Briefcase className="size-4" /> Project allocation
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
        </div>
      </div>

      {myProjectEntries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Not currently on any project.</p>
      ) : (
        <>
          {needsScroll && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-2 py-1.5">
              <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} disabled={!canGoBack} aria-label="Previous period">
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-[11px] font-medium text-muted-foreground">
                {allPeriods[firstVisibleIdx] && formatPeriodLabel(allPeriods[firstVisibleIdx])}
                {" – "}
                {allPeriods[lastVisibleIdx] && formatPeriodLabel(allPeriods[lastVisibleIdx])}
                <span className="ml-1.5 font-normal text-muted-foreground/70">(scroll or drag the bar below to browse)</span>
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => step(1)} disabled={!canGoForward} aria-label="Next period">
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}

          <div className="mt-3 flex">
            <div className="flex shrink-0 flex-col" style={{ width: NAME_COL_WIDTH }}>
              <div style={{ height: HEADER_HEIGHT }} />
              <div className="flex flex-col divide-y divide-border/70">
                {myProjectEntries.map(({ project, roleOnProject }) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    style={{ height: ROW_HEIGHT }}
                    className="flex items-center gap-3 pr-3 transition-colors hover:bg-secondary/50"
                  >
                    <ProjectAvatar project={project} clients={clients} size="sm" className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{roleOnProject}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div
              ref={scrollAreaRef}
              className="min-w-0 flex-1 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <div style={{ width: stripWidth }}>
                <div className="flex gap-[2px] text-[10px] text-muted-foreground" style={{ height: HEADER_HEIGHT }}>
                  {allPeriods.map((p, i) => (
                    <span key={p} style={{ width: colWidth }} className="shrink-0 text-center">
                      {granularity === "month" ? (i % 2 === 0 ? formatPeriodLabel(p) : "") : formatPeriodLabel(p)}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col divide-y divide-border/70">
                  {myProjectEntries.map(({ project }, rowIdx) => {
                    const chartData = allPeriods.map((p) => ({
                      key: p,
                      label: formatPeriodLabel(p),
                      value:
                        granularity === "month"
                          ? getProjectMonthlyAllocationLive(
                              projectRoleRequirements,
                              projectRoleAssignments,
                              person.id,
                              project.id,
                              getWeeksInMonth(p)
                            )
                          : getPersonWeeklyAllocationForProject(
                              projectRoleRequirements,
                              projectRoleAssignments,
                              person.id,
                              project.id,
                              p
                            ),
                    }));
                    return (
                      <div key={project.id} style={{ height: ROW_HEIGHT }} className="flex items-center">
                        <AllocationHeatmapRow data={chartData} columnWidth={colWidth} flipTooltip={rowIdx === 0} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
