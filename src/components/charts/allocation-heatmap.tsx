"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface HeatmapCellDatum {
  key: string;
  label: string;
  value: number;
}

export const HEATMAP_LEGEND_STEPS = [0, 25, 50, 75, 100];

const MIN_OPACITY = 0.12;
const MAX_OPACITY = 1;

/** Percent (0-100+, clamped) -> opacity of the brand hue. Linear and
 * monotone by construction — the "one hue, light -> dark" sequential rule,
 * built as an opacity ramp over --primary so it composites correctly on
 * both the light and dark card surface without a separate hex table. */
function cellOpacity(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * (clamped / 100);
}

function cellColor(percent: number): string {
  return `color-mix(in srgb, var(--primary) ${Math.round(cellOpacity(percent) * 100)}%, transparent)`;
}

/**
 * One heatmap row: a fixed brand hue, absolute % -> opacity per cell (never
 * relative to the row's own max, unlike a bar chart — so two rows, or a row
 * and the legend, are directly comparable at a glance). Hover/focus shows
 * the exact value; a 2px surface gap separates adjacent cells instead of a
 * border (dataviz mark spec).
 */
export function AllocationHeatmapRow({
  data,
  valueFormatter = (v: number) => `${v}% allocated`,
  className,
}: {
  data: HeatmapCellDatum[];
  valueFormatter?: (v: number) => string;
  className?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className={cn("relative flex min-w-0 flex-1 gap-[2px]", className)} onMouseLeave={() => setHoverIdx(null)}>
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-elevation-2"
          style={{ left: `${((hoverIdx + 0.5) / data.length) * 100}%`, transform: "translate(-50%, -100%)" }}
        >
          <span className="font-medium">{valueFormatter(data[hoverIdx].value)}</span>{" "}
          <span className="text-muted-foreground">{data[hoverIdx].label}</span>
        </div>
      )}
      {data.map((d, i) => (
        <button
          key={d.key}
          type="button"
          onMouseEnter={() => setHoverIdx(i)}
          onFocus={() => setHoverIdx(i)}
          onBlur={() => setHoverIdx(null)}
          aria-label={`${d.label}: ${valueFormatter(d.value)}`}
          className={cn(
            "h-[26px] flex-1 rounded-[3px] outline-none transition-transform duration-150",
            "focus-visible:ring-2 focus-visible:ring-ring",
            hoverIdx === i && "scale-y-[1.15]"
          )}
          style={{ backgroundColor: cellColor(d.value) }}
        />
      ))}
    </div>
  );
}

/** Legend for the heatmap above — same ramp, five reference points. Always
 * shown alongside the grid: color alone can't be read precisely, so the key
 * plus per-cell hover together carry the value (dataviz interaction rule:
 * a tooltip enhances, it never gates — the legend is the non-hover fallback). */
export function AllocationHeatmapLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[10px] whitespace-nowrap text-muted-foreground", className)}>
      <span>Allocation</span>
      {HEATMAP_LEGEND_STEPS.map((step) => (
        <span key={step} className="flex items-center gap-1">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: cellColor(step) }} />
          {step}%
        </span>
      ))}
    </div>
  );
}
