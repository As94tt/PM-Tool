"use client";

import { cn } from "@/lib/utils";

export interface HorizontalBarItem {
  key: string;
  label: string;
  value: number;
  meta?: string;
}

/** Ranked magnitude list: single brand hue, direct value labels (required — the
 * brand orange fails the 3:1 contrast floor as a thin mark, so the number is
 * always shown rather than relying on the bar's color/length alone). */
export function HorizontalBarList({
  items,
  className,
}: {
  items: HorizontalBarItem[];
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-foreground/90">{item.label}</span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
