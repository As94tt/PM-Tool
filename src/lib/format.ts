/** Today's local calendar date as YYYY-MM-DD. Deliberately not
 * `new Date().toISOString().slice(0, 10)`, which returns the UTC date and
 * is wrong by one day for part of the day in any timezone ahead of UTC. */
export function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-DE", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeToToday(iso: string): string {
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  const diffMonths =
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());

  if (diffMonths === 0) return "This month";
  if (diffMonths > 0) return diffMonths === 1 ? "In 1 month" : `In ${diffMonths} months`;
  const abs = Math.abs(diffMonths);
  return abs === 1 ? "1 month ago" : `${abs} months ago`;
}
