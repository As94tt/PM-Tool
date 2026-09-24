"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Users,
  FolderKanban,
  CalendarClock,
  Grid3x3,
  Gauge,
  ArrowRight,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { useCurrentPerson } from "@/store/hooks";
import {
  getDashboardStats,
  getPeopleBecomingAvailableSoon,
  getBudgetOverview,
  fullName,
  initials,
} from "@/lib/data/queries";
import {
  getHorizonMonths,
  formatMonthLabel,
  getAllocationForPersonMonth,
  getAllocationStatus,
  ALLOCATION_STATUS_STYLES,
  ALLOCATION_STATUS_LABEL,
} from "@/lib/data/capacity";
import { formatCompactCurrency, formatRelativeToToday } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HorizontalBarList } from "@/components/charts/horizontal-bar-list";
import { MiniBarChart } from "@/components/charts/mini-bar-chart";
import type { AllocationStatus, ProjectStatus } from "@/lib/types";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: "bg-status-healthy/15 text-status-healthy",
  planned: "bg-status-under/15 text-status-under",
  completed: "bg-secondary text-muted-foreground",
};

export default function DashboardPage() {
  const person = useCurrentPerson();
  const role = useAppStore((s) => s.viewAsRole);
  const people = useAppStore((s) => s.people);
  const projects = useAppStore((s) => s.projects);
  const skills = useAppStore((s) => s.skills);
  const personSkills = useAppStore((s) => s.personSkills);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const budgetPlans = useAppStore((s) => s.budgetPlans);
  const locations = useAppStore((s) => s.locations);
  const clients = useAppStore((s) => s.clients);

  const stats = getDashboardStats(people, projects, skills, resourceAllocations);
  const availableSoon = getPeopleBecomingAvailableSoon(people, resourceAllocations, { withinMonths: 3 }).slice(0, 5);

  const now = useMemo(() => new Date().getTime(), []);
  const recentProjects = [...projects]
    .toSorted(
      (a, b) =>
        Math.abs(new Date(a.startDate).getTime() - now) - Math.abs(new Date(b.startDate).getTime() - now)
    )
    .slice(0, 5);

  const skillCounts = skills
    .map((s) => ({ key: s.id, label: s.name, value: personSkills.filter((ps) => ps.skillId === s.id).length }))
    .toSorted((a, b) => b.value - a.value)
    .slice(0, 8);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const canSeeBudget = role === "management" || role === "admin";
  const horizon = getHorizonMonths(12);
  const budget = getBudgetOverview(projects, budgetPlans);
  const capacityData = horizon.map((month) => {
    const avg =
      people.reduce((sum, p) => sum + Math.min(100, getAllocationForPersonMonth(resourceAllocations, p.id, month)), 0) /
      Math.max(1, people.length);
    const status = getAllocationStatus(avg);
    return {
      key: month,
      label: formatMonthLabel(month, { month: "short" }),
      value: Math.round(avg),
      colorClass: ALLOCATION_STATUS_STYLES[status].bar,
      status,
    };
  });

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          Welcome back, {person.firstName}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Find colleagues, past project experience, and the skills your next engagement needs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Employees" value={stats.peopleCount} icon={Users} href="/people" tone="brand" />
        <StatCard label="Active projects" value={stats.activeProjects} icon={FolderKanban} href="/projects?status=active" />
        <StatCard label="Planned projects" value={stats.plannedProjects} icon={CalendarClock} href="/projects?status=planned" />
        <StatCard label="Skills tracked" value={stats.skillsCount} icon={Grid3x3} href="/skill-matrix" />
        <StatCard
          label="Available capacity"
          value={`${stats.availableCapacityPercent}%`}
          icon={Gauge}
          sublabel="Company-wide, this month"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="gap-0 p-0 shadow-elevation-1">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <h2 className="font-heading text-base font-semibold">Recent project activity</h2>
              <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <ul className="divide-y divide-border/70">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/50"
                  >
                    <ProjectAvatar project={project} clients={clients} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
                    </div>
                    <Badge variant="secondary" className={STATUS_BADGE[project.status]}>
                      {project.status}
                    </Badge>
                    <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      {formatRelativeToToday(project.startDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="gap-0 p-0 shadow-elevation-1">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <h2 className="font-heading text-base font-semibold">Popular skills</h2>
              <Link href="/skill-matrix" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Open Skill Matrix <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="px-5 py-5">
              <HorizontalBarList items={skillCounts} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="gap-0 p-0 shadow-elevation-1">
            <div className="border-b border-border/70 px-5 py-4">
              <h2 className="font-heading text-base font-semibold">People becoming available</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Next 3 months</p>
            </div>
            {availableSoon.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Everyone stays booked over the next 3 months.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {availableSoon.map(({ person: p, freeFromMonth }) => {
                  const location = locations.find((l) => l.id === p.locationId);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/people/${p.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/50"
                      >
                        <Avatar className="size-9">
                          <AvatarImage src={p.avatarUrl} alt={fullName(p)} />
                          <AvatarFallback>{initials(p)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{fullName(p)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.jobTitle}
                            {location ? ` · ${location.city}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-status-healthy">
                          {formatMonthLabel(freeFromMonth)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {canSeeBudget && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="gap-0 p-0 shadow-elevation-1">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
              <div>
                <h2 className="font-heading text-base font-semibold">Budget overview</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Across {projects.length} projects · next 12 months</p>
              </div>
              <Link href="/resources" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Budget planning <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 py-5">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="size-3.5" /> Total budget
                </p>
                <p className="mt-1 font-heading text-xl font-semibold">{formatCompactCurrency(budget.totalBudget)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowUpRight className="size-3.5" /> Planned personnel cost
                </p>
                <p className="mt-1 font-heading text-xl font-semibold">
                  {formatCompactCurrency(budget.totalPlannedPersonnelCost)}
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <MiniBarChart
                data={budget.monthlyTotals.map((m) => ({
                  key: m.month,
                  label: formatMonthLabel(m.month, { month: "short" }),
                  value: m.plannedCost,
                }))}
                valueFormatter={(v) => formatCompactCurrency(v)}
                height={88}
              />
            </div>
          </Card>

          <Card className="gap-0 p-0 shadow-elevation-1">
            <div className="border-b border-border/70 px-5 py-4">
              <h2 className="font-heading text-base font-semibold">Capacity utilization</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Average allocation across all employees</p>
            </div>
            <div className="px-5 pt-5 pb-3">
              <MiniBarChart
                data={capacityData}
                valueFormatter={(v) => `${v}% allocated`}
                height={88}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/70 px-5 py-3">
              {(Object.keys(ALLOCATION_STATUS_LABEL) as AllocationStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`size-2 rounded-full ${ALLOCATION_STATUS_STYLES[status].dot}`} />
                  {ALLOCATION_STATUS_LABEL[status]}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
