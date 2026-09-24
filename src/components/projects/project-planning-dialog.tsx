"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, X, Briefcase } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { fullName, initials } from "@/lib/data/queries";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { selectLabel } from "@/lib/select-utils";
import {
  getHorizonWeeks,
  formatWeekLabel,
  totalCost,
  sumFteMap,
  blendedDayRate,
  WORKING_DAYS_PER_WEEK,
} from "@/lib/data/week-planning";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project } from "@/lib/types";

const WEEK_WINDOW = 6;

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

function WeekFteCell({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(value ? String(value) : "");
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ""))}
      onBlur={() => {
        const n = Math.max(0, Math.min(3, Number(text) || 0));
        setText(n ? String(n) : "");
        if (n !== value) onCommit(n);
      }}
      placeholder="0"
      className="h-6 w-10 rounded-md border border-input bg-transparent px-1 text-center text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

function WeekEuroCell({
  fte,
  dayRate,
  onCommitFte,
}: {
  fte: number;
  dayRate: number;
  onCommitFte: (fte: number) => void;
}) {
  const euroValue = Math.round(fte * dayRate * WORKING_DAYS_PER_WEEK);
  const [text, setText] = useState(euroValue ? String(euroValue) : "");
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        const euro = Math.max(0, Number(text) || 0);
        setText(euro ? String(euro) : "");
        const nextFte = dayRate > 0 ? euro / (dayRate * WORKING_DAYS_PER_WEEK) : 0;
        if (Math.round(nextFte * 100) !== Math.round(fte * 100)) onCommitFte(nextFte);
      }}
      placeholder="€0"
      className="h-6 w-14 rounded-md border border-input bg-transparent px-1 text-center text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

export function ProjectPlanningDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const people = useAppStore((s) => s.people);
  const roles = useAppStore((s) => s.roles);
  const requirements = useAppStore((s) => s.projectRoleRequirements);
  const assignments = useAppStore((s) => s.projectRoleAssignments);

  const addRoleRequirement = useAppStore((s) => s.addRoleRequirement);
  const removeRoleRequirement = useAppStore((s) => s.removeRoleRequirement);
  const updateRoleRequirementDayRate = useAppStore((s) => s.updateRoleRequirementDayRate);
  const setRoleRequirementWeekFte = useAppStore((s) => s.setRoleRequirementWeekFte);
  const addRoleAssignment = useAppStore((s) => s.addRoleAssignment);
  const removeRoleAssignment = useAppStore((s) => s.removeRoleAssignment);
  const updateRoleAssignmentDayRate = useAppStore((s) => s.updateRoleAssignmentDayRate);
  const setRoleAssignmentWeekFte = useAppStore((s) => s.setRoleAssignmentWeekFte);

  const [newRoleName, setNewRoleName] = useState(roles[0]?.name ?? "");
  const [newRoleDayRate, setNewRoleDayRate] = useState("800");
  const [addPersonState, setAddPersonState] = useState<Record<string, { personId: string; dayRate: string }>>({});

  const projReqs = requirements.filter((r) => r.projectId === project.id);
  const projAsgs = assignments.filter((a) => a.projectId === project.id);

  const horizonStart = new Date(`${project.startDate}T00:00:00`);
  const allWeeks = getHorizonWeeks(60, horizonStart);
  const visibleWeeks = allWeeks.slice(weekOffset, weekOffset + WEEK_WINDOW);

  const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }));
  const assignedPersonIdsByRole = new Map<string, Set<string>>();
  for (const a of projAsgs) {
    const set = assignedPersonIdsByRole.get(a.roleRequirementId) ?? new Set<string>();
    set.add(a.personId);
    assignedPersonIdsByRole.set(a.roleRequirementId, set);
  }

  function handleAddRole() {
    if (!newRoleName.trim()) return;
    const dayRate = Math.max(0, Number(newRoleDayRate) || 0);
    addRoleRequirement({ projectId: project.id, roleName: newRoleName.trim(), dayRate });
    toast.success("Role added to the plan");
  }

  function handleAddPerson(requirementId: string) {
    const form = addPersonState[requirementId];
    if (!form?.personId) return;
    const dayRate = Math.max(0, Number(form.dayRate) || 0);
    addRoleAssignment({ projectId: project.id, roleRequirementId: requirementId, personId: form.personId, dayRate });
    toast.success("Person staffed to role");
    setAddPersonState((prev) => ({ ...prev, [requirementId]: { personId: "", dayRate: "" } }));
  }

  const totalFteByWeek = visibleWeeks.map((w) => projReqs.reduce((sum, r) => sum + (r.ftePerWeek[w] ?? 0), 0));
  const totalFteAll = projReqs.reduce((sum, r) => sum + sumFteMap(r.ftePerWeek), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClock className="size-3.5" /> Resource & Budget Planning
      </DialogTrigger>
      <DialogContent className="flex max-h-[88vh] w-full max-w-5xl flex-col gap-3 overflow-hidden p-4 sm:max-w-5xl">
        <div>
          <h2 className="font-heading text-base font-semibold">Resource & Budget Planning</h2>
          <p className="text-xs text-muted-foreground">{project.name}</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-2 py-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setWeekOffset((o) => Math.max(0, o - WEEK_WINDOW))}
            disabled={weekOffset === 0}
            aria-label="Previous weeks"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-[11px] font-medium text-muted-foreground">
            Week of {formatWeekLabel(visibleWeeks[0])} – {formatWeekLabel(visibleWeeks[visibleWeeks.length - 1])}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setWeekOffset((o) => Math.min(allWeeks.length - WEEK_WINDOW, o + WEEK_WINDOW))}
            disabled={weekOffset + WEEK_WINDOW >= allWeeks.length}
            aria-label="Next weeks"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border/70 px-3 py-1.5">
              <h3 className="text-xs font-semibold">Required roles (plan) — FTE per week</h3>
            </div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/70 text-left text-[10px] font-medium text-muted-foreground">
                  <th className="min-w-[120px] px-2 py-1.5">Role</th>
                  <th className="min-w-[68px] px-1 py-1.5">Rate</th>
                  {visibleWeeks.map((w) => (
                    <th key={w} className="w-10 border-l border-border/50 px-0.5 py-1.5 text-center">
                      {formatWeekLabel(w)}
                    </th>
                  ))}
                  <th className="min-w-[70px] border-l border-border/50 px-2 py-1.5 text-right">Sum</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {projReqs.map((req) => (
                  <tr key={req.id} className="border-b border-border/40">
                    <td className="px-2 py-1 font-medium">{req.roleName}</td>
                    <td className="px-1 py-1">
                      <DayRateInput value={req.dayRate} onCommit={(v) => updateRoleRequirementDayRate(req.id, v)} />
                    </td>
                    {visibleWeeks.map((w) => (
                      <td key={w} className="border-l border-border/40 px-0.5 py-1 text-center">
                        <WeekFteCell
                          value={req.ftePerWeek[w] ?? 0}
                          onCommit={(v) => setRoleRequirementWeekFte(req.id, w, v)}
                        />
                      </td>
                    ))}
                    <td className="border-l border-border/40 px-2 py-1 text-right font-medium tabular-nums">
                      {formatCompactCurrency(totalCost(req.ftePerWeek, req.dayRate))}
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
                ))}
                {projReqs.length > 0 && (
                  <tr className="border-b border-border/40 bg-secondary/30 font-medium">
                    <td className="px-2 py-1" colSpan={2}>
                      Total FTE
                    </td>
                    {totalFteByWeek.map((v, i) => (
                      <td key={visibleWeeks[i]} className="border-l border-border/40 px-0.5 py-1 text-center tabular-nums">
                        {v > 0 ? v : "–"}
                      </td>
                    ))}
                    <td className="border-l border-border/40 px-2 py-1 text-right tabular-nums">
                      {totalFteAll.toFixed(2)} FTE
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
                  <td colSpan={visibleWeeks.length} />
                  <td colSpan={2} className="px-2 py-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddRole} disabled={!newRoleName.trim()}>
                      <Plus className="size-3" /> Add role
                    </Button>
                  </td>
                </tr>
                {projReqs.length === 0 && (
                  <tr>
                    <td colSpan={4 + visibleWeeks.length} className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      No required roles yet — add one above to start the staffing plan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border">
            <div className="border-b border-border/70 px-3 py-1.5">
              <h3 className="text-xs font-semibold">Staffing (actual) — € per week</h3>
            </div>
            {projReqs.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">Define at least one required role first.</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-left text-[10px] font-medium text-muted-foreground">
                    <th className="min-w-[140px] px-2 py-1.5">Person</th>
                    <th className="min-w-[68px] px-1 py-1.5">Rate</th>
                    {visibleWeeks.map((w) => (
                      <th key={w} className="w-10 border-l border-border/50 px-0.5 py-1.5 text-center">
                        {formatWeekLabel(w)}
                      </th>
                    ))}
                    <th className="min-w-[70px] border-l border-border/50 px-2 py-1.5 text-right">Sum</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {projReqs.map((req) => {
                    const roleAssignments = projAsgs.filter((a) => a.roleRequirementId === req.id);
                    const roleTotalCost = roleAssignments.reduce((s, a) => s + totalCost(a.ftePerWeek, a.dayRate), 0);
                    const roleTotalFte = roleAssignments.reduce((s, a) => s + sumFteMap(a.ftePerWeek), 0);
                    const blended = blendedDayRate(roleTotalCost, roleTotalFte);
                    const assignedIds = assignedPersonIdsByRole.get(req.id) ?? new Set<string>();
                    const availablePeople = people.filter((p) => !assignedIds.has(p.id));
                    const personOptions = [
                      { value: "none", label: "Select a person" },
                      ...availablePeople.map((p) => ({ value: p.id, label: fullName(p) })),
                    ];
                    const formState = addPersonState[req.id] ?? { personId: "", dayRate: String(req.dayRate) };

                    return (
                      <Fragment key={req.id}>
                        <tr className="border-b border-border/40 bg-secondary/30">
                          <td colSpan={2} className="px-2 py-1 font-medium">
                            <span className="flex items-center gap-1">
                              <Briefcase className="size-3 text-muted-foreground" /> {req.roleName}
                            </span>
                          </td>
                          <td colSpan={visibleWeeks.length} />
                          <td colSpan={2} className="px-2 py-1 text-right text-[10px] text-muted-foreground">
                            Sum {formatCompactCurrency(roleTotalCost)}
                            {blended > 0 && <> · Blended {formatCurrency(Math.round(blended))}/day</>}
                          </td>
                        </tr>
                        {roleAssignments.map((a) => {
                          const person = people.find((p) => p.id === a.personId);
                          return (
                            <tr key={a.id} className="border-b border-border/40">
                              <td className="px-2 py-1">
                                <Link href={`/people/${a.personId}`} className="flex items-center gap-1.5 hover:text-primary">
                                  <Avatar className="size-5">
                                    <AvatarImage src={person?.avatarUrl} alt={person ? fullName(person) : ""} />
                                    <AvatarFallback className="text-[9px]">{person ? initials(person) : "?"}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate text-[11px] font-medium">{person ? fullName(person) : "Unknown"}</span>
                                </Link>
                              </td>
                              <td className="px-1 py-1">
                                <DayRateInput value={a.dayRate} onCommit={(v) => updateRoleAssignmentDayRate(a.id, v)} />
                              </td>
                              {visibleWeeks.map((w) => (
                                <td key={w} className="border-l border-border/40 px-0.5 py-1 text-center">
                                  <WeekEuroCell
                                    fte={a.ftePerWeek[w] ?? 0}
                                    dayRate={a.dayRate}
                                    onCommitFte={(fte) => setRoleAssignmentWeekFte(a.id, w, fte)}
                                  />
                                </td>
                              ))}
                              <td className="border-l border-border/40 px-2 py-1 text-right font-medium tabular-nums">
                                {formatCompactCurrency(totalCost(a.ftePerWeek, a.dayRate))}
                              </td>
                              <td className="px-0.5 py-1 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeRoleAssignment(a.id)}
                                  aria-label={`Remove ${person ? fullName(person) : "person"}`}
                                  className="size-5"
                                >
                                  <X className="size-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-b border-border/40">
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
                                <SelectValue placeholder="Add person…">{selectLabel(personOptions, "Add person…")}</SelectValue>
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
                          <td colSpan={visibleWeeks.length} />
                          <td colSpan={2} className="px-2 py-1">
                            <Button
                              size="sm"
                              className="h-6 text-[11px]"
                              onClick={() => handleAddPerson(req.id)}
                              disabled={!formState.personId}
                            >
                              <Plus className="size-3" /> Add
                            </Button>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
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
