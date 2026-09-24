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
  if (percent >= 90) return "full";
  if (percent >= 50) return "healthy";
  return "underallocated";
}

export const ALLOCATION_STATUS_LABEL: Record<AllocationStatus, string> = {
  underallocated: "Underallocated",
  healthy: "Healthy allocation",
  full: "Fully allocated",
  overallocated: "Overallocated",
};

/**
 * Tailwind class fragments keyed by status, used for bars / badges / dots.
 * Colors are the validated status-* tokens (dataviz palette validator: all 4
 * pass lightness band, chroma floor, and CVD separation in light + dark).
 */
export const ALLOCATION_STATUS_STYLES: Record<
  AllocationStatus,
  { bar: string; badge: string; dot: string }
> = {
  underallocated: {
    bar: "bg-status-under",
    badge: "bg-status-under/15 text-status-under",
    dot: "bg-status-under",
  },
  healthy: {
    bar: "bg-status-healthy",
    badge: "bg-status-healthy/15 text-status-healthy",
    dot: "bg-status-healthy",
  },
  full: {
    bar: "bg-status-full",
    badge: "bg-status-full/15 text-status-full",
    dot: "bg-status-full",
  },
  overallocated: {
    bar: "bg-status-over",
    badge: "bg-status-over/15 text-status-over",
    dot: "bg-status-over",
  },
};
