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
