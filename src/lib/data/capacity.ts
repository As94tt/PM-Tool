import type { AllocationStatus, ResourceAllocation } from "@/lib/types";

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthToDate(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function formatMonthLabel(month: string, opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }): string {
  return monthToDate(month).toLocaleDateString("en-US", opts);
}

/** Rolling N-month horizon starting at the given date's month (defaults to now). */
export function getHorizonMonths(count = 12, start: Date = new Date()): string[] {
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  return Array.from({ length: count }, (_, i) => monthKey(addMonths(startMonth, i)));
}

/**
 * Months to chart for a project: starts at the project's own start month,
 * runs through however far people are actually allocated — the later of
 * the project's declared end month or the last month with a real
 * (non-zero) allocation row for this project — so the chart never cuts
 * off while people still show allocation. Capped at `maxMonths` purely as
 * a sanity ceiling for pathological data, not a normal display limit.
 */
export function getProjectChartMonths(
  startDate: string,
  endDate: string | null,
  allocations: { projectId: string; month: string; allocationPercent: number }[],
  projectId: string,
  opts: { maxMonths?: number } = {}
): string[] {
  const { maxMonths = 30 } = opts;
  const projStart = monthToDate(startDate.slice(0, 7));

  const lastAllocatedMonth = allocations
    .filter((a) => a.projectId === projectId && a.allocationPercent > 0)
    .map((a) => a.month)
    .toSorted()
    .at(-1);

  let endMonth = endDate ? monthToDate(endDate.slice(0, 7)) : projStart;
  if (lastAllocatedMonth) {
    const lastDate = monthToDate(lastAllocatedMonth);
    if (lastDate > endMonth) endMonth = lastDate;
  }
  const endKey = monthKey(endMonth);

  const months: string[] = [];
  let cursor = projStart;
  while (monthKey(cursor) <= endKey && months.length < maxMonths) {
    months.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
  }
  return months.length > 0 ? months : [monthKey(projStart)];
}

export function getAllocationForPersonMonth(
  allocations: ResourceAllocation[],
  personId: string,
  month: string
): number {
  return allocations
    .filter((a) => a.personId === personId && a.month === month)
    .reduce((sum, a) => sum + a.allocationPercent, 0);
}

/** Same as getAllocationForPersonMonth, but scoped to one project — for a
 * per-project view (e.g. a project's own team heatmap) that must show only
 * that project's share of a person's time, not their total across every
 * project they're staffed on. */
export function getAllocationForPersonProjectMonth(
  allocations: ResourceAllocation[],
  personId: string,
  projectId: string,
  month: string
): number {
  return allocations
    .filter((a) => a.personId === personId && a.projectId === projectId && a.month === month)
    .reduce((sum, a) => sum + a.allocationPercent, 0);
}

export function getAllocationStatus(percent: number): AllocationStatus {
  if (percent > 100) return "overallocated";
  if (percent === 100) return "full";
  if (percent >= 75) return "partial";
  return "underallocated";
}

export const ALLOCATION_STATUS_LABEL: Record<AllocationStatus, string> = {
  underallocated: "Underallocated (<75%)",
  partial: "Partially allocated (75–99%)",
  full: "Fully allocated (100%)",
  overallocated: "Overallocated (>100%)",
};

/**
 * Tailwind class fragments keyed by status, used for bars / badges / dots.
 * Colors are the validated alloc-* tokens (dataviz palette validator: all 4
 * pass lightness band, chroma floor, and CVD separation in light + dark).
 * Kept separate from --status-under/--status-healthy, which are a different,
 * general-purpose palette reused for project-status badges & department dots.
 */
export const ALLOCATION_STATUS_STYLES: Record<
  AllocationStatus,
  { bar: string; badge: string; dot: string }
> = {
  underallocated: {
    bar: "bg-alloc-under",
    badge: "bg-alloc-under/15 text-alloc-under",
    dot: "bg-alloc-under",
  },
  partial: {
    bar: "bg-alloc-partial",
    badge: "bg-alloc-partial/15 text-alloc-partial",
    dot: "bg-alloc-partial",
  },
  full: {
    bar: "bg-alloc-full",
    badge: "bg-alloc-full/15 text-alloc-full",
    dot: "bg-alloc-full",
  },
  overallocated: {
    bar: "bg-alloc-over",
    badge: "bg-alloc-over/15 text-alloc-over",
    dot: "bg-alloc-over",
  },
};
