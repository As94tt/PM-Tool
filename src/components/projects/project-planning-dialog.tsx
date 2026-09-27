"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, X, Briefcase } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { fullName, initials } from "@/lib/data/queries";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { formatMonthLabel } from "@/lib/data/capacity";
import { selectLabel } from "@/lib/select-utils";
import {
  getProjectChartWeeks,
  formatWeekLabel,
  weekToMonthKey,
  totalCost,
  sumFteMap,
  blendedDayRate,
  weeklyCost,
} from "@/lib/data/week-planning";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project } from "@/lib/types";

const MONTH_WINDOW = 6;
const MAX_SEAT_FTE = 1;

/** One visible column — either a whole month (collapsed) or one of its
 * individual weeks (only appear for the single currently-expanded month). */
type Column = { key: string; type: "month"; weeks: string[] } | { key: string; type: "week"; month: string };

function formatFte(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function DayRateInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        const n = Math.max(0, Number(text) || 0);
        setText(String(n));
        if (n !== value) onCommit(n);
      }}
      className="h-6 w-16 rounded-md border border-input bg-transparent px-1.5 text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

function FteCell({ value, onCommit, title }: { value: number; onCommit: (v: number) => void; title: string }) {
  const [text, setText] = useState(value ? String(value) : "");
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ""))}
      onBlur={() => {
        const n = Math.max(0, Math.min(MAX_SEAT_FTE, Number(text) || 0));
        setText(n ? String(n) : "");
        if (n !== value) onCommit(n);
      }}
      placeholder="0"
      title={title}
      className="h-6 w-10 rounded-md border border-input bg-transparent px-1 text-center text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

export function ProjectPlanningDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const people = useAppStore((s) => s.people);
  const roles = useAppStore((s) => s.roles);
  const requirements = useAppStore((s) => s.projectRoleRequirements);
  const assignments = useAppStore((s) => s.projectRoleAssignments);

  const addRoleRequirement = useAppStore((s) => s.addRoleRequirement);
  const removeRoleRequirement = useAppStore((s) => s.removeRoleRequirement);
  const updateRoleRequirementDayRate = useAppStore((s) => s.updateRoleRequirementDayRate);
  const setRoleRequirementWeeksFte = useAppStore((s) => s.setRoleRequirementWeeksFte);
  const addRoleAssignment = useAppStore((s) => s.addRoleAssignment);
  const removeRoleAssignment = useAppStore((s) => s.removeRoleAssignment);
  const updateRoleAssignmentDayRate = useAppStore((s) => s.updateRoleAssignmentDayRate);

  const [newRoleName, setNewRoleName] = useState(roles[0]?.name ?? "");
  const [newRoleDayRate, setNewRoleDayRate] = useState("800");
  const [addPersonState, setAddPersonState] = useState<Record<string, { personId: string; dayRate: string }>>({});

  const projReqs = requirements.filter((r) => r.projectId === project.id);
  const projAsgs = assignments.filter((a) => a.projectId === project.id);

  const allWeeks = useMemo(
    () => getProjectChartWeeks(project.startDate, project.endDate, requirements, project.id),
    [project.startDate, project.endDate, requirements, project.id]
  );
  const weeksByMonth = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const w of allWeeks) {
      const m = weekToMonthKey(w);
      const list = map.get(m) ?? [];
      list.push(w);
      map.set(m, list);
    }
    return map;
  }, [allWeeks]);
  const allMonths = useMemo(() => Array.from(weeksByMonth.keys()), [weeksByMonth]);

  const visibleMonths = allMonths.slice(monthOffset, monthOffset + MONTH_WINDOW);
  const columns: Column[] = visibleMonths.flatMap((month): Column[] => {
    const weeks = weeksByMonth.get(month) ?? [];
    if (month === expandedMonth) return weeks.map((w) => ({ key: w, type: "week", month }));
    return [{ key: month, type: "month", weeks }];
  });

  const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }));
  const projectWideAssignedPersonIds = new Set(projAsgs.map((a) => a.personId));

  function handleAddRole() {
    if (!newRoleName.trim()) return;
    const dayRate = Math.max(0, Number(newRoleDayRate) || 0);
    addRoleRequirement({ projectId: project.id, roleName: newRoleName.trim(), dayRate });
    toast.success("Role added to the plan");
  }

  function handleAddPerson(requirementId: string, requirementDayRate: number) {
    const form = addPersonState[requirementId];
    if (!form?.personId) return;
    // An explicit "0" must stay 0 (e.g. a pro-bono seat) — only fall back to
    // the requirement's own rate when the field was left blank, not just
    // whenever the typed value happens to be falsy.
    const typed = form.dayRate.trim();
    const dayRate = typed === "" ? requirementDayRate : Math.max(0, Number(typed) || 0);
    addRoleAssignment({ projectId: project.id, roleRequirementId: requirementId, personId: form.personId, dayRate });
    toast.success("Person staffed to role");
    setAddPersonState((prev) => ({ ...prev, [requirementId]: { personId: "", dayRate: "" } }));
  }

  /** A column's FTE for one role: the week's own value, or (collapsed) the
   * average across that month's weeks — since FTE is a headcount *level*,
   * not something that should sum when several weeks are folded into one
   * column (unlike cost, which legitimately accumulates). */
  function columnFte(ftePerWeek: Record<string, number>, col: Column): number {
    if (col.type === "week") return ftePerWeek[col.key] ?? 0;
    if (col.weeks.length === 0) return 0;
    const avg = col.weeks.reduce((sum, w) => sum + (ftePerWeek[w] ?? 0), 0) / col.weeks.length;
    return Math.round(avg * 100) / 100;
  }

  /** A column's cost for one seat: the week's own cost, or (collapsed) the
   * sum across that month's weeks — cost legitimately accumulates. */
  function columnCost(ftePerWeek: Record<string, number>, dayRate: number, col: Column): number {
    if (col.type === "week") return weeklyCost(ftePerWeek[col.key] ?? 0, dayRate);
    return col.weeks.reduce((sum, w) => sum + weeklyCost(ftePerWeek[w] ?? 0, dayRate), 0);
  }

  /** Same collapsed-month-averages-its-weeks rule as columnFte, applied to
   * the per-week sum across every role instead of one role's own map. */
  function totalColumnFte(col: Column): number {
    const weekTotal = (w: string) => projReqs.reduce((sum, r) => sum + (r.ftePerWeek[w] ?? 0), 0);
    if (col.type === "week") return weekTotal(col.key);
    if (col.weeks.length === 0) return 0;
    return col.weeks.reduce((sum, w) => sum + weekTotal(w), 0) / col.weeks.length;
  }
  const totalFteByColumn = columns.map(totalColumnFte);
  const totalFteAll = projReqs.reduce((sum, r) => sum + sumFteMap(r.ftePerWeek), 0);
  const totalActiveWeeks = new Set(projReqs.flatMap((r) => Object.keys(r.ftePerWeek))).size;
  const totalAvgFte = totalActiveWeeks > 0 ? totalFteAll / totalActiveWeeks : 0;

  const actualByColumn = columns.map((col) =>
    projAsgs.reduce((sum, a) => {
      const req = projReqs.find((r) => r.id === a.roleRequirementId);
      return sum + columnCost(req?.ftePerWeek ?? {}, a.dayRate, col);
    }, 0)
  );
  const totalActualCost = projAsgs.reduce((sum, a) => {
    const req = projReqs.find((r) => r.id === a.roleRequirementId);
    return sum + totalCost(req?.ftePerWeek ?? {}, a.dayRate);
  }, 0);
  const totalActualFte = projAsgs.reduce((sum, a) => {
    const req = projReqs.find((r) => r.id === a.roleRequirementId);
    return sum + sumFteMap(req?.ftePerWeek ?? {});
  }, 0);
  const actualBlendedRate = blendedDayRate(totalActualCost, totalActualFte);

  function columnLabel(col: Column): string {
    return col.type === "month" ? formatMonthLabel(col.key, { month: "short" }) : formatWeekLabel(col.key);
  }

  function periodRangeLabel(): string {
    const first = visibleMonths[0];
    const last = visibleMonths[visibleMonths.length - 1];
    if (!first) return "";
    return first === last ? formatMonthLabel(first, { month: "short", year: "numeric" }) : `${formatMonthLabel(first, { month: "short" })} – ${formatMonthLabel(last, { month: "short", year: "numeric" })}`;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClock className="size-3.5" /> Resource & Budget Planning
      </DialogTrigger>
      <DialogContent className="flex max-h-[88vh] w-full max-w-6xl flex-col gap-3 overflow-hidden p-4 sm:max-w-6xl">
        <div>
          <h2 className="font-heading text-base font-semibold">Resource & Budget Planning</h2>
          <p className="text-xs text-muted-foreground">{project.name}</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-2 py-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonthOffset((o) => Math.max(0, o - MONTH_WINDOW))}
            disabled={monthOffset === 0}
            aria-label="Previous months"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-[11px] font-medium text-muted-foreground">{periodRangeLabel()}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonthOffset((o) => Math.min(Math.max(0, allMonths.length - MONTH_WINDOW), o + MONTH_WINDOW))}
            disabled={monthOffset + MONTH_WINDOW >= allMonths.length}
            aria-label="Next months"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <div className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5">
              <h3 className="text-xs font-semibold">Required roles (plan) — one row per seat, FTE per month or week</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-left text-[10px] font-medium text-muted-foreground">
                    <th rowSpan={2} className="min-w-[120px] px-2 py-1.5 align-bottom">
                      Role
                    </th>
                    <th rowSpan={2} className="min-w-[68px] px-1 py-1.5 align-bottom">
                      Rate
                    </th>
                    {visibleMonths.map((month) => {
                      const weeks = weeksByMonth.get(month) ?? [];
                      const isExpanded = month === expandedMonth;
                      return (
                        <th
                          key={month}
                          colSpan={isExpanded ? weeks.length : 1}
                          rowSpan={isExpanded ? 1 : 2}
                          className="border-l border-border/50 px-0.5 py-1.5 text-center align-bottom"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedMonth(isExpanded ? null : month)}
                            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-secondary/70"
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${formatMonthLabel(month)}`}
                          >
                            {formatMonthLabel(month, { month: "short" })}
                            {isExpanded ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
                          </button>
                        </th>
                      );
                    })}
                    <th rowSpan={2} className="min-w-[80px] border-l border-border/50 px-2 py-1.5 text-right align-bottom">
                      Avg FTE
                    </th>
                    <th rowSpan={2} className="w-6" />
                  </tr>
                  <tr className="border-b border-border/70 text-center text-[10px] font-medium text-muted-foreground">
                    {visibleMonths.flatMap((month) => {
                      if (month !== expandedMonth) return [];
                      const weeks = weeksByMonth.get(month) ?? [];
                      return weeks.map((w) => (
                        <th key={w} className="w-10 border-l border-border/50 px-0.5 py-1">
                          {formatWeekLabel(w)}
                        </th>
                      ));
                    })}
                  </tr>
                </thead>
                <tbody>
                  {projReqs.map((req) => {
                    const roleActiveWeeks = Object.keys(req.ftePerWeek).length;
                    const roleAvgFte = roleActiveWeeks > 0 ? sumFteMap(req.ftePerWeek) / roleActiveWeeks : 0;
                    return (
                      <tr key={req.id} className="border-b border-border/40">
                        <td className="px-2 py-1 font-medium">{req.roleName}</td>
                        <td className="px-1 py-1">
                          <DayRateInput value={req.dayRate} onCommit={(v) => updateRoleRequirementDayRate(req.id, v)} />
                        </td>
                        {columns.map((col) => (
                          <td key={col.key} className="border-l border-border/40 px-0.5 py-1 text-center">
                            <FteCell
                              value={columnFte(req.ftePerWeek, col)}
                              onCommit={(v) =>
                                setRoleRequirementWeeksFte(req.id, col.type === "week" ? [col.key] : col.weeks, v)
                              }
                              title={
                                col.type === "week"
                                  ? "One seat — FTE between 0 and 1. Need two of this role? Add a second row."
                                  : `Sets every week in ${formatMonthLabel(col.key)} to this FTE.`
                              }
                            />
                          </td>
                        ))}
                        <td className="border-l border-border/40 px-2 py-1 text-right font-medium tabular-nums">
                          {roleActiveWeeks > 0
                            ? `${formatFte(roleAvgFte)} FTE (${roleActiveWeeks} wk${roleActiveWeeks === 1 ? "" : "s"})`
                            : "–"}
                        </td>
                        <td className="px-0.5 py-1 text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeRoleRequirement(req.id)}
                            aria-label={`Remove ${req.roleName}`}
                            className="size-5"
                          >
                            <X className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {projReqs.length > 0 && (
                    <tr className="border-b border-border/40 bg-secondary/30 font-medium">
                      <td className="px-2 py-1" colSpan={2}>
                        Total FTE
                      </td>
                      {totalFteByColumn.map((v, i) => (
                        <td key={columns[i].key} className="border-l border-border/40 px-0.5 py-1 text-center tabular-nums">
                          {v > 0 ? formatFte(v) : "–"}
                        </td>
                      ))}
                      <td className="border-l border-border/40 px-2 py-1 text-right tabular-nums">
                        {totalActiveWeeks > 0 ? `~${formatFte(totalAvgFte)} FTE (${totalActiveWeeks} wks)` : "–"}
                      </td>
                      <td />
                    </tr>
                  )}
                  <tr>
                    <td className="px-2 py-1.5">
                      <Select value={newRoleName} onValueChange={(v) => v && setNewRoleName(v)}>
                        <SelectTrigger size="sm" className="h-7 w-full min-w-[120px] text-xs">
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
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newRoleDayRate}
                        onChange={(e) => setNewRoleDayRate(e.target.value.replace(/[^0-9]/g, ""))}
                        className="h-6 w-16 rounded-md border border-input bg-transparent px-1.5 text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </td>
                    <td colSpan={columns.length} />
                    <td colSpan={2} className="px-2 py-1.5">
                      <Button size="sm" className="h-7 text-xs" onClick={handleAddRole} disabled={!newRoleName.trim()}>
                        <Plus className="size-3" /> Add role
                      </Button>
                    </td>
                  </tr>
                  {projReqs.length === 0 && (
                    <tr>
                      <td colSpan={4 + columns.length} className="px-2 py-1.5 text-[11px] text-muted-foreground">
                        No required roles yet — add one above to start the staffing plan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5">
              <h3 className="text-xs font-semibold">Staffing (actual) — one row per seat, € per month or week</h3>
              {projAsgs.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Total {formatCompactCurrency(totalActualCost)}
                  {actualBlendedRate > 0 && <> · Blended {formatCurrency(Math.round(actualBlendedRate))}/day</>}
                </span>
              )}
            </div>
            {projReqs.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">Define at least one required role first.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-[10px] font-medium text-muted-foreground">
                      <th className="min-w-[110px] px-2 py-1.5">Role</th>
                      <th className="min-w-[130px] px-2 py-1.5">Person</th>
                      <th className="min-w-[68px] px-1 py-1.5">Rate</th>
                      {columns.map((col) => (
                        <th key={col.key} className="w-10 border-l border-border/50 px-0.5 py-1.5 text-center">
                          {columnLabel(col)}
                        </th>
                      ))}
                      <th className="min-w-[70px] border-l border-border/50 px-2 py-1.5 text-right">Sum</th>
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {projReqs.map((req) => {
                      const assignment = projAsgs.find((a) => a.roleRequirementId === req.id);
                      const person = assignment ? people.find((p) => p.id === assignment.personId) : undefined;
                      const availablePeople = people.filter((p) => !projectWideAssignedPersonIds.has(p.id));
                      const personOptions = [
                        { value: "none", label: "Select a person" },
                        ...availablePeople.map((p) => ({ value: p.id, label: fullName(p) })),
                      ];
                      const formState = addPersonState[req.id] ?? { personId: "", dayRate: String(req.dayRate) };

                      return (
                        <Fragment key={req.id}>
                          {assignment ? (
                            <tr className="border-b border-border/40">
                              <td className="px-2 py-1 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="size-3" /> {req.roleName}
                                </span>
                              </td>
                              <td className="px-2 py-1">
                                <Link href={`/people/${assignment.personId}`} className="flex items-center gap-1.5 hover:text-primary">
                                  <Avatar className="size-5">
                                    <AvatarImage src={person?.avatarUrl} alt={person ? fullName(person) : ""} />
                                    <AvatarFallback className="text-[9px]">{person ? initials(person) : "?"}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate text-[11px] font-medium">{person ? fullName(person) : "Unknown"}</span>
                                </Link>
                              </td>
                              <td className="px-1 py-1">
                                <DayRateInput
                                  value={assignment.dayRate}
                                  onCommit={(v) => updateRoleAssignmentDayRate(assignment.id, v)}
                                />
                              </td>
                              {columns.map((col) => (
                                <td key={col.key} className="border-l border-border/40 px-0.5 py-1 text-center tabular-nums text-[11px]">
                                  {formatCompactCurrency(columnCost(req.ftePerWeek, assignment.dayRate, col))}
                                </td>
                              ))}
                              <td className="border-l border-border/40 px-2 py-1 text-right font-medium tabular-nums">
                                {formatCompactCurrency(totalCost(req.ftePerWeek, assignment.dayRate))}
                              </td>
                              <td className="px-0.5 py-1 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeRoleAssignment(assignment.id)}
                                  aria-label={`Unassign ${person ? fullName(person) : "person"}`}
                                  className="size-5"
                                >
                                  <X className="size-3" />
                                </Button>
                              </td>
                            </tr>
                          ) : (
                            <tr className="border-b border-border/40">
                              <td className="px-2 py-1 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="size-3" /> {req.roleName}
                                </span>
                              </td>
                              <td className="px-2 py-1">
                                <Select
                                  value={formState.personId || "none"}
                                  onValueChange={(v) =>
                                    setAddPersonState((prev) => ({
                                      ...prev,
                                      [req.id]: { ...formState, personId: v && v !== "none" ? v : "" },
                                    }))
                                  }
                                >
                                  <SelectTrigger size="sm" className="h-6 w-full min-w-[120px] text-[11px]">
                                    <SelectValue placeholder="Select a person…">{selectLabel(personOptions, "Select a person…")}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {personOptions.map((o) => (
                                      <SelectItem key={o.value} value={o.value} disabled={o.value === "none"}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formState.dayRate}
                                  onChange={(e) =>
                                    setAddPersonState((prev) => ({
                                      ...prev,
                                      [req.id]: { ...formState, dayRate: e.target.value.replace(/[^0-9]/g, "") },
                                    }))
                                  }
                                  placeholder={String(req.dayRate)}
                                  className="h-6 w-16 rounded-md border border-input bg-transparent px-1.5 text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                />
                              </td>
                              {columns.map((col) => (
                                <td key={col.key} className="border-l border-border/40 px-0.5 py-1 text-center text-[11px] text-border">
                                  –
                                </td>
                              ))}
                              <td className="border-l border-border/40 px-2 py-1" />
                              <td className="px-0.5 py-1">
                                <Button
                                  size="icon-sm"
                                  className="size-5"
                                  onClick={() => handleAddPerson(req.id, req.dayRate)}
                                  disabled={!formState.personId}
                                  aria-label={`Assign to ${req.roleName}`}
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {projAsgs.length > 0 && (
                      <tr className="border-b border-border/40 bg-secondary/30 font-medium">
                        <td className="px-2 py-1" colSpan={3}>
                          Total (assigned)
                        </td>
                        {actualByColumn.map((v, i) => (
                          <td key={columns[i].key} className="border-l border-border/40 px-0.5 py-1 text-center tabular-nums">
                            {v > 0 ? formatCompactCurrency(v) : "–"}
                          </td>
                        ))}
                        <td className="border-l border-border/40 px-2 py-1 text-right tabular-nums">
                          {formatCompactCurrency(totalActualCost)}
                        </td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border/70 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
