"use client";

import Link from "next/link";
import { Wallet, TrendingDown, TrendingUp, FolderKanban } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { getBudgetOverview } from "@/lib/data/queries";
import { getHorizonMonths, formatMonthLabel } from "@/lib/data/capacity";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectAvatar } from "@/components/shared/project-avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniBarChart } from "@/components/charts/mini-bar-chart";
import type { ProjectStatus } from "@/lib/types";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: "bg-status-healthy/15 text-status-healthy",
  planned: "bg-status-under/15 text-status-under",
  completed: "bg-secondary text-muted-foreground",
};

export function BudgetView() {
  const projects = useAppStore((s) => s.projects);
  const budgetPlans = useAppStore((s) => s.budgetPlans);
  const clients = useAppStore((s) => s.clients);

  const overview = getBudgetOverview(projects, budgetPlans);
  const remaining = overview.totalBudget - overview.totalPlannedPersonnelCost;
  const horizon = getHorizonMonths(12);

  const rows = [...projects].toSorted((a, b) => b.totalBudget - a.totalBudget);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total budget" value={formatCompactCurrency(overview.totalBudget)} icon={Wallet} tone="brand" />
        <StatCard label="Planned personnel cost" value={formatCompactCurrency(overview.totalPlannedPersonnelCost)} icon={TrendingUp} />
        <StatCard label="Budget remaining" value={formatCompactCurrency(remaining)} icon={TrendingDown} />
        <StatCard label="Projects with budget" value={projects.length} icon={FolderKanban} />
      </div>

      <Card className="p-6 shadow-elevation-1">
        <h2 className="font-heading text-base font-semibold">12-month cost forecast</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Planned personnel cost across all projects, {formatMonthLabel(horizon[0])} – {formatMonthLabel(horizon[11])}
        </p>
        <div className="mt-5">
          <MiniBarChart
            data={overview.monthlyTotals.map((m) => ({
              key: m.month,
              label: formatMonthLabel(m.month, { month: "short" }),
              value: m.plannedCost,
            }))}
            valueFormatter={(v) => formatCompactCurrency(v)}
            height={110}
          />
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden p-0 shadow-elevation-1">
        <div className="border-b border-border/70 px-6 py-4">
          <h2 className="font-heading text-base font-semibold">Budget by project</h2>
        </div>
        <div className="divide-y divide-border/70">
          {rows.map((project) => {
            const plan = budgetPlans.find((b) => b.projectId === project.id);
            const planned = plan?.plannedPersonnelCost ?? 0;
            const projectRemaining = project.totalBudget - planned;
            const usagePercent = project.totalBudget > 0 ? Math.min(100, Math.round((planned / project.totalBudget) * 100)) : 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-secondary/50 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <ProjectAvatar project={project} clients={clients} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
                  </div>
                  <Badge variant="secondary" className={STATUS_BADGE[project.status]}>
                    {project.status}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-6 text-right text-xs">
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-medium tabular-nums text-foreground">{formatCurrency(project.totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Planned</p>
                    <p className="font-medium tabular-nums text-foreground">{formatCurrency(planned)}</p>
                  </div>
                  <div className="w-24">
                    <p className="text-muted-foreground">Remaining</p>
                    <p className={`font-medium tabular-nums ${projectRemaining < 0 ? "text-destructive" : "text-foreground"}`}>
                      {formatCurrency(projectRemaining)}
                    </p>
                  </div>
                  <div className="hidden w-20 sm:block">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${usagePercent > 100 ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-muted-foreground">{usagePercent}% planned</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
