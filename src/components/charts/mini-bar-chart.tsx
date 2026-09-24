"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface MiniBarDatum {
  key: string;
  label: string;
  value: number;
  colorClass?: string;
}

/**
 * Compact single-axis bar chart. Thin bars, 3px rounded data-ends, recessive
 * baseline, hover tooltip (per dataviz interaction guidance). One brand hue by
 * default; pass colorClass per-datum for status-encoded bars.
 */
export function MiniBarChart({
  data,
  height = 96,
  valueFormatter = (v: number) => String(v),
  defaultColorClass = "bg-primary",
  showLabels = true,
  className,
}: {
  data: MiniBarDatum[];
  height?: number;
  valueFormatter?: (v: number) => string;
  defaultColorClass?: string;
  showLabels?: boolean;
  className?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("relative", className)}>
      {hoverIdx !== null && data[hoverIdx] && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-elevation-2">
          <span className="font-medium">{data[hoverIdx].label}</span>{" "}
          <span className="text-muted-foreground">{valueFormatter(data[hoverIdx].value)}</span>
        </div>
      )}
      <div
        className="flex items-end gap-1 border-b border-border/70"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {data.map((d, i) => (
          <div
            key={d.key}
            className="group relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHoverIdx(i)}
          >
            <div
              className={cn(
                "w-full rounded-t-[3px] transition-[opacity] duration-150",
                d.colorClass ?? defaultColorClass,
                hoverIdx !== null && hoverIdx !== i ? "opacity-40" : "opacity-100"
              )}
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex gap-1 text-[10px] text-muted-foreground">
          {data.map((d, i) => (
            <div key={d.key} className="flex-1 text-center">
              {i % 2 === 0 ? d.label : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
