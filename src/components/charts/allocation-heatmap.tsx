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
  columnWidth,
  flipTooltip = false,
}: {
  data: HeatmapCellDatum[];
  valueFormatter?: (v: number) => string;
  className?: string;
  /** Fixed pixel width per cell instead of the default even-split-to-fit —
   * for a row that lives inside a horizontally scrollable strip (so its
   * total width can exceed its container and actually overflow/scroll),
   * rather than always fitting exactly to the available space. */
  columnWidth?: number;
  /** Renders the hover tooltip below the row instead of above — for a row
   * with nothing above it to give the tooltip room (e.g. the topmost row of
   * a heatmap), where "above" would clip against the card's own edge. */
  flipTooltip?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div
      className={cn("relative flex gap-[2px]", columnWidth ? "shrink-0" : "min-w-0 flex-1", className)}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-elevation-2",
            flipTooltip ? "top-full mt-1" : "bottom-full mb-1",
            // The centered default overflows past the row's own edge for its
            // first/last cell, clipping against the scroll container — pin
            // the tooltip's edge to the cell's edge there instead.
            hoverIdx !== 0 && hoverIdx !== data.length - 1 && "-translate-x-1/2"
          )}
          style={
            hoverIdx === data.length - 1
              ? { right: 0 }
              : { left: hoverIdx === 0 ? 0 : `${((hoverIdx + 0.5) / data.length) * 100}%` }
          }
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
            "h-[26px] rounded-[3px] outline-none transition-transform duration-150",
            columnWidth ? "shrink-0" : "flex-1",
            "focus-visible:ring-2 focus-visible:ring-ring",
            hoverIdx === i && "scale-y-[1.15]"
          )}
          style={{ backgroundColor: cellColor(d.value), width: columnWidth }}
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
