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
 * Months to chart for a project: starts at the later of the project's own
 * start month or `lookbackMonths` before now (so a long-running project's
 * chart doesn't open on ancient history), runs to the project's end month
 * (or `lookbackMonths` + `maxMonths` out, if still ongoing), capped at
 * `maxMonths` total columns.
 */
export function getProjectChartMonths(
  startDate: string,
  endDate: string | null,
  opts: { maxMonths?: number; lookbackMonths?: number } = {}
): string[] {
  const { maxMonths = 10, lookbackMonths = 3 } = opts;
  const today = new Date();
  const projStart = monthToDate(startDate.slice(0, 7));
  const windowStart = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -lookbackMonths);
  const rangeStart = projStart > windowStart ? projStart : windowStart;
  const projEnd = endDate ? monthToDate(endDate.slice(0, 7)) : addMonths(windowStart, lookbackMonths + maxMonths - 1);
  const endKey = monthKey(projEnd);

  const months: string[] = [];
  let cursor = rangeStart;
  while (monthKey(cursor) <= endKey && months.length < maxMonths) {
    months.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
  }
  return months;
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
