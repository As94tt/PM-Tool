import { monthKey, monthToDate } from "./capacity";

export const WORKING_DAYS_PER_WEEK = 5;

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The Monday (local midnight) of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return monday;
}

/** Week key = ISO date ("YYYY-MM-DD") of that week's Monday. Sorts
 * chronologically as a plain string, unlike ISO week numbers. */
export function weekKey(d: Date): string {
  return isoDateLocal(startOfWeek(d));
}

export function addWeeks(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7);
}

export function weekToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Rolling N-week horizon starting at the Monday of `start`'s week (defaults to now). */
export function getHorizonWeeks(count = 12, start: Date = new Date()): string[] {
  const startMonday = startOfWeek(start);
  return Array.from({ length: count }, (_, i) => weekKey(addWeeks(startMonday, i)));
}

export function formatWeekLabel(key: string): string {
  return weekToDate(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Which month-grid column (per capacity.ts's monthKey) a week's cost should
 * roll up into, for combining with the app's existing month-based budget view. */
export function weekToMonthKey(key: string): string {
  return monthKey(weekToDate(key));
}

/** Every week (by its Monday key) whose weekToMonthKey bucket is exactly
 * this month — the inverse of weekToMonthKey. Lets a monthly view average a
 * person's weekly staffing-plan FTE live, without depending on a
 * separately-synced monthly cache that can (and, in this project's
 * history, repeatedly has) drift out of agreement with it. */
export function getWeeksInMonth(month: string): string[] {
  const start = monthToDate(month);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const mondays = new Set<string>();
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    mondays.add(weekKey(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return Array.from(mondays)
    .filter((w) => weekToMonthKey(w) === month)
    .toSorted();
}

export function sumFteMap(ftePerWeek: Record<string, number>): number {
  return Object.values(ftePerWeek).reduce((sum, v) => sum + (v || 0), 0);
}

export function weeklyCost(fte: number, dayRate: number): number {
  return fte * dayRate * WORKING_DAYS_PER_WEEK;
}

/** Total planned/actual cost across every week stored for a role
 * requirement or assignment (not just a currently-visible window). */
export function totalCost(ftePerWeek: Record<string, number>, dayRate: number): number {
  return sumFteMap(ftePerWeek) * dayRate * WORKING_DAYS_PER_WEEK;
}

/** The effective day rate that would reproduce the same total cost if paid
 * uniformly across all FTE-days delivered — i.e. a role's actual blended
 * rate across everyone assigned to it, weighted by how much FTE each
 * person actually contributed. */
export function blendedDayRate(totalCostValue: number, totalFte: number): number {
  const totalFteDays = totalFte * WORKING_DAYS_PER_WEEK;
  return totalFteDays > 0 ? totalCostValue / totalFteDays : 0;
}

/**
 * Weeks to chart for a project — the weekly-staffing-plan equivalent of
 * capacity.ts's getProjectChartMonths: starts at the Monday of the
 * project's own start date, runs through the later of its declared end
 * date or the last week with a real (>0) FTE entry across any of its role
 * requirements (so the chart never cuts off while a seat still shows FTE),
 * capped at `maxWeeks` purely as a sanity ceiling.
 */
export function getProjectChartWeeks(
  startDate: string,
  endDate: string | null,
  requirements: { projectId: string; ftePerWeek: Record<string, number> }[],
  projectId: string,
  opts: { maxWeeks?: number } = {}
): string[] {
  const { maxWeeks = 120 } = opts;
  const projStart = startOfWeek(weekToDate(startDate));

  const lastActiveWeek = requirements
    .filter((r) => r.projectId === projectId)
    .flatMap((r) => Object.entries(r.ftePerWeek).filter(([, fte]) => fte > 0).map(([week]) => week))
    .toSorted()
    .at(-1);

  let endBound = endDate ? startOfWeek(weekToDate(endDate)) : projStart;
  if (lastActiveWeek) {
    const lastDate = weekToDate(lastActiveWeek);
    if (lastDate > endBound) endBound = lastDate;
  }
  const endKey = weekKey(endBound);

  const weeks: string[] = [];
  let cursor = projStart;
  while (weekKey(cursor) <= endKey && weeks.length < maxWeeks) {
    weeks.push(weekKey(cursor));
    cursor = addWeeks(cursor, 1);
  }
  return weeks.length > 0 ? weeks : [weekKey(projStart)];
}
