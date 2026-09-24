"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Briefcase } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { RoleGate } from "@/components/shared/role-gate";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WEEK_WINDOW = 8;

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
      className="h-7 w-20 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
      className="h-7 w-12 rounded-md border border-input bg-transparent px-1.5 text-center text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
      className="h-7 w-16 rounded-md border border-input bg-transparent px-1.5 text-center text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

export default function ProjectPlanningPage() {
  const { id } = useParams<{ id: string }>();

  const projects = useAppStore((s) => s.projects);
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

  const [weekOffset, setWeekOffset] = useState(0);
  const [newRoleName, setNewRoleName] = useState(roles[0]?.name ?? "");
  const [newRoleDayRate, setNewRoleDayRate] = useState("800");
  const [addPersonState, setAddPersonState] = useState<Record<string, { personId: string; dayRate: string }>>({});
  const now = useMemo(() => new Date().getTime(), []);

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="font-heading text-lg font-semibold">Project not found</p>
        <Link href="/projects" className="text-sm text-primary hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  const projReqs = requirements.filter((r) => r.projectId === project.id);
  const projAsgs = assignments.filter((a) => a.projectId === project.id);

  const horizonStart = new Date(Math.min(new Date(`${project.startDate}T00:00:00`).getTime(), now - 28 * 86400000));
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
    addRoleRequirement({ projectId: project!.id, roleName: newRoleName.trim(), dayRate });
    toast.success("Role added to the plan");
  }

  function handleAddPerson(requirementId: string) {
    const form = addPersonState[requirementId];
    if (!form?.personId) return;
    const dayRate = Math.max(0, Number(form.dayRate) || 0);
    addRoleAssignment({ projectId: project!.id, roleRequirementId: requirementId, personId: form.personId, dayRate });
    toast.success("Person staffed to role");
    setAddPersonState((prev) => ({ ...prev, [requirementId]: { personId: "", dayRate: "" } }));
  }

  return (
    <RoleGate allow={["admin", "management"]}>
      <div className="flex flex-col gap-6 pb-8">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to {project.name}
        </Link>

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Resource & Budget Planning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} · plan required roles and day rates, then staff real people against them.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-elevation-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => Math.max(0, o - WEEK_WINDOW))}
            disabled={weekOffset === 0}
          >
            <ChevronLeft /> Previous {WEEK_WINDOW} weeks
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            Week of {formatWeekLabel(visibleWeeks[0])} – {formatWeekLabel(visibleWeeks[visibleWeeks.length - 1])}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => Math.min(allWeeks.length - WEEK_WINDOW, o + WEEK_WINDOW))}
            disabled={weekOffset + WEEK_WINDOW >= allWeeks.length}
          >
            Next {WEEK_WINDOW} weeks <ChevronRight />
          </Button>
        </div>

        <Card className="overflow-hidden p-0 shadow-elevation-1">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-heading text-base font-semibold">Required roles (plan)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Planned FTE per week, by role — the demand side of the staffing plan.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="min-w-[160px] px-4 py-2">Role</th>
                  <th className="min-w-[90px] px-2 py-2">Day rate</th>
                  {visibleWeeks.map((w) => (
                    <th key={w} className="min-w-[56px] border-l border-border/70 px-1 py-2 text-center">
                      {formatWeekLabel(w)}
                    </th>
                  ))}
                  <th className="min-w-[90px] border-l border-border/70 px-3 py-2 text-right">Sum</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {projReqs.map((req) => (
                  <tr key={req.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-medium">{req.roleName}</td>
                    <td className="px-2 py-2">
                      <DayRateInput value={req.dayRate} onCommit={(v) => updateRoleRequirementDayRate(req.id, v)} />
                    </td>
                    {visibleWeeks.map((w) => (
                      <td key={w} className="border-l border-border/50 px-1 py-1.5 text-center">
                        <WeekFteCell
                          value={req.ftePerWeek[w] ?? 0}
                          onCommit={(v) => setRoleRequirementWeekFte(req.id, w, v)}
                        />
                      </td>
                    ))}
                    <td className="border-l border-border/50 px-3 py-2 text-right font-medium tabular-nums">
                      {formatCompactCurrency(totalCost(req.ftePerWeek, req.dayRate))}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRoleRequirement(req.id)}
                        aria-label={`Remove ${req.roleName}`}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2.5">
                    <Select value={newRoleName} onValueChange={(v) => v && setNewRoleName(v)}>
                      <SelectTrigger size="sm" className="w-full min-w-[150px]">
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
                  <td className="px-2 py-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newRoleDayRate}
                      onChange={(e) => setNewRoleDayRate(e.target.value.replace(/[^0-9]/g, ""))}
                      className="h-7 w-20 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td colSpan={visibleWeeks.length} />
                  <td colSpan={2} className="px-3 py-2">
                    <Button size="sm" onClick={handleAddRole} disabled={!newRoleName.trim()}>
                      <Plus className="size-3.5" /> Add role
                    </Button>
                  </td>
                </tr>
                {projReqs.length === 0 && (
                  <tr>
                    <td colSpan={4 + visibleWeeks.length} className="px-4 py-3 text-xs text-muted-foreground">
                      No required roles yet — add one above to start the staffing plan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden p-0 shadow-elevation-1">
          <div className="border-b border-border/70 px-5 py-4">
            <h2 className="font-heading text-base font-semibold">Staffing (actual)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Real people assigned against each role, shown in € per week — the supply side.
            </p>
          </div>

          {projReqs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Define at least one required role first.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/70">
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
                  <div key={req.id} className="px-5 py-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Briefcase className="size-3.5 text-muted-foreground" /> {req.roleName}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Role sum: <span className="font-medium text-foreground">{formatCompactCurrency(roleTotalCost)}</span>
                        </span>
                        <span>
                          Blended rate:{" "}
                          <span className="font-medium text-foreground">
                            {blended > 0 ? `${formatCurrency(Math.round(blended))}/day` : "—"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                            <th className="min-w-[170px] px-3 py-2">Person</th>
                            <th className="min-w-[90px] px-2 py-2">Day rate</th>
                            {visibleWeeks.map((w) => (
                              <th key={w} className="min-w-[64px] border-l border-border/70 px-1 py-2 text-center">
                                {formatWeekLabel(w)}
                              </th>
                            ))}
                            <th className="min-w-[90px] border-l border-border/70 px-3 py-2 text-right">Sum</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {roleAssignments.map((a) => {
                            const person = people.find((p) => p.id === a.personId);
                            return (
                              <tr key={a.id} className="border-b border-border/50 last:border-b-0">
                                <td className="px-3 py-2">
                                  <Link href={`/people/${a.personId}`} className="flex items-center gap-2 hover:text-primary">
                                    <Avatar className="size-6">
                                      <AvatarImage src={person?.avatarUrl} alt={person ? fullName(person) : ""} />
                                      <AvatarFallback className="text-[10px]">{person ? initials(person) : "?"}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-xs font-medium">{person ? fullName(person) : "Unknown"}</span>
                                  </Link>
                                </td>
                                <td className="px-2 py-2">
                                  <DayRateInput value={a.dayRate} onCommit={(v) => updateRoleAssignmentDayRate(a.id, v)} />
                                </td>
                                {visibleWeeks.map((w) => (
                                  <td key={w} className="border-l border-border/50 px-1 py-1.5 text-center">
                                    <WeekEuroCell
                                      fte={a.ftePerWeek[w] ?? 0}
                                      dayRate={a.dayRate}
                                      onCommitFte={(fte) => setRoleAssignmentWeekFte(a.id, w, fte)}
                                    />
                                  </td>
                                ))}
                                <td className="border-l border-border/50 px-3 py-2 text-right font-medium tabular-nums">
                                  {formatCompactCurrency(totalCost(a.ftePerWeek, a.dayRate))}
                                </td>
                                <td className="px-1 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => removeRoleAssignment(a.id)}
                                    aria-label={`Remove ${person ? fullName(person) : "person"}`}
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td className="px-3 py-2">
                              <Select
                                value={formState.personId || "none"}
                                onValueChange={(v) =>
                                  setAddPersonState((prev) => ({
                                    ...prev,
                                    [req.id]: { ...formState, personId: v && v !== "none" ? v : "" },
                                  }))
                                }
                              >
                                <SelectTrigger size="sm" className="w-full min-w-[150px]">
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
                            <td className="px-2 py-2">
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
                                className="h-7 w-20 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              />
                            </td>
                            <td colSpan={visibleWeeks.length} />
                            <td colSpan={2} className="px-3 py-2">
                              <Button size="sm" onClick={() => handleAddPerson(req.id)} disabled={!formState.personId}>
                                <Plus className="size-3.5" /> Add
                              </Button>
                            </td>
                          </tr>
                          {roleAssignments.length === 0 && (
                            <tr>
                              <td colSpan={4 + visibleWeeks.length} className="px-3 py-2 text-xs text-muted-foreground">
                                No one staffed to this role yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </RoleGate>
  );
}
