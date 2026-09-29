"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import {
  fullName,
  initials,
  getProjectMemberDetails,
  getPersonWeeklyAllocationForProject,
  getProjectMonthlyAllocationLive,
} from "@/lib/data/queries";
import { getProjectChartMonths, formatMonthLabel } from "@/lib/data/capacity";
import { getProjectChartWeeks, formatWeekLabel, getWeeksInMonth } from "@/lib/data/week-planning";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AllocationHeatmapRow, AllocationHeatmapLegend } from "@/components/charts/allocation-heatmap";
import { ProjectPlanningDialog } from "@/components/projects/project-planning-dialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type Granularity = "month" | "week";

const WINDOW_SIZE: Record<Granularity, number> = { month: 12, week: 8 };
/** Floor for a period column's width — used as-is once there are enough
 * periods that even this minimum would overflow the available space (so the
 * strip scrolls); otherwise columns stretch evenly to fill the full width,
 * so a short project's chart never leaves dead space on the right. */
const MIN_COL_WIDTH: Record<Granularity, number> = { month: 48, week: 64 };
const NAME_COL_WIDTH = 188;
const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 18;
/** Must match the gap-[2px] AllocationHeatmapRow puts between its cells. */
const CELL_GAP = 2;

export function TeamAllocationCard({ project, canSeeBudget }: { project: Project; canSeeBudget: boolean }) {
  const people = useAppStore((s) => s.people);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const projectRoleRequirements = useAppStore((s) => s.projectRoleRequirements);
  const projectRoleAssignments = useAppStore((s) => s.projectRoleAssignments);

  const [granularity, setGranularity] = useState<Granularity>("month");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: 0, visibleWidth: 0 });

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
  const minColWidth = MIN_COL_WIDTH[granularity];
  // AllocationHeatmapRow puts a 2px gap between cells — both the header
  // labels row and the strip's total declared width need to account for
  // that same gap, or the two rows drift out of alignment and the strip's
  // real rendered width silently exceeds its declared width.
  const gapTotal = Math.max(0, allPeriods.length - 1) * CELL_GAP;
  // Stretch-to-fill vs. fixed-and-scrollable: if every period would fit at
  // the minimum width within the space actually available, stretch columns
  // evenly to use all of it (no scrolling needed, no dead space on the
  // right); otherwise fall back to the fixed minimum, which lets the strip
  // overflow and scroll. Both colWidth and maxLeft are derived purely from
  // measured visibleWidth (not from a DOM scrollWidth read), so they can
  // never fall out of sync with each other across a render.
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

  // Tracks real scroll position and the container's own width (for the
  // Prev/Next disabled state, the stretch-vs-scroll decision above, and the
  // visible-range label) and keeps it in sync on resize, since the strip's
  // own width can change independently of any scroll event.
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

  // Lets a mouse wheel (or trackpad) scroll the strip horizontally, since a
  // plain vertical wheel over an overflow-x container does nothing on its
  // own. React attaches its own onWheel handler as passive, so
  // preventDefault() inside a JSX handler is silently ignored — a native
  // listener is the only way to actually stop the page from scrolling
  // vertically while hovering here.
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

  // Real per-column pitch (a column's own width plus the gap after it) —
  // dividing/multiplying by colWidth alone here would drift the computed
  // index further ahead of the actually-visible column the more periods
  // there are, since CELL_GAP accumulates once per column.
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
            {members.map(({ person, roleOnProject }) => (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                style={{ height: ROW_HEIGHT }}
                className="flex items-center gap-3 pr-3 transition-colors hover:bg-secondary/50"
              >
                <Avatar className="size-9">
                  <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
                  <AvatarFallback>{initials(person)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fullName(person)}</p>
                  <p className="truncate text-xs text-muted-foreground">{roleOnProject}</p>
                </div>
              </Link>
            ))}
            {members.length === 0 && (
              <p style={{ height: ROW_HEIGHT }} className="flex items-center text-sm text-muted-foreground">
                No team members yet.
              </p>
            )}
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
              {members.map(({ person }, memberIdx) => {
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
                      : getPersonWeeklyAllocationForProject(projectRoleRequirements, projectRoleAssignments, person.id, project.id, p),
                }));
                return (
                  <div key={person.id} style={{ height: ROW_HEIGHT }} className="flex items-center">
                    <AllocationHeatmapRow data={chartData} columnWidth={colWidth} flipTooltip={memberIdx === 0} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
