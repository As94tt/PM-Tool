"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectLabel } from "@/lib/select-utils";
import { useAppStore } from "@/store/app-store-provider";
import { getAllocationStatus, ALLOCATION_STATUS_STYLES, formatMonthLabel } from "@/lib/data/capacity";
import { fullName } from "@/lib/data/queries";
import type { Person, Project, ResourceAllocation } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AllocationCell({
  person,
  month,
  allocations,
  projects,
}: {
  person: Person;
  month: string;
  allocations: ResourceAllocation[];
  projects: Project[];
}) {
  const [open, setOpen] = useState(false);
  const [addProjectId, setAddProjectId] = useState("");
  const [addPercent, setAddPercent] = useState("50");

  const upsertAllocation = useAppStore((s) => s.assignToProject);
  const removeAllocation = useAppStore((s) => s.removeAllocation);

  const rows = allocations.filter((a) => a.personId === person.id && a.month === month);
  const total = rows.reduce((sum, r) => sum + r.allocationPercent, 0);
  const status = getAllocationStatus(total);
  const styles = ALLOCATION_STATUS_STYLES[status];

  const assignedProjectIds = new Set(rows.map((r) => r.projectId));
  const availableProjects = projects.filter((p) => p.status !== "completed" && !assignedProjectIds.has(p.id));
  const projectOptions = [
    { value: "none", label: "Select a project" },
    ...availableProjects.map((p) => ({ value: p.id, label: p.name })),
  ];

  function handleAdd() {
    if (!addProjectId) return;
    const pct = Math.max(1, Math.min(100, Number(addPercent) || 0));
    upsertAllocation({ personId: person.id, projectId: addProjectId, month, allocationPercent: pct });
    toast.success("Allocation added");
    setAddProjectId("");
    setAddPercent("50");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            className={cn(
              "flex h-8 w-full items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-opacity hover:opacity-80",
              total > 0 ? styles.bar : "bg-transparent text-border hover:bg-secondary"
            )}
          >
            {total > 0 ? `${total}%` : "–"}
          </button>
        }
      />
      <PopoverContent className="w-72" align="center">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{fullName(person)}</p>
          <span className="text-xs text-muted-foreground">{formatMonthLabel(month, { month: "long", year: "numeric" })}</span>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const project = projects.find((p) => p.id === r.projectId);
            return (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs">{project?.name ?? "Unknown project"}</span>
                <span className="text-xs font-medium tabular-nums">{r.allocationPercent}%</span>
                <Button variant="ghost" size="icon-sm" onClick={() => removeAllocation(r.id)} aria-label="Remove allocation">
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-xs text-muted-foreground">No allocation this month.</p>}
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
          <Select value={addProjectId || "none"} onValueChange={(v) => setAddProjectId(v && v !== "none" ? v : "")}>
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue placeholder="Add project…">{selectLabel(projectOptions, "Add project…")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={o.value === "none"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Plain native <input>, not the shadcn/Base UI Input: Base UI's Input
              primitive silently fails to paint its controlled value when nested
              inside a Popover (value is correct in the DOM, never rendered on
              screen, in every browser tested) — see pm-tool-base-ui-quirks memory. */}
          <input
            type="text"
            inputMode="numeric"
            value={addPercent}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
              setAddPercent(digits === "" ? "" : String(Math.min(100, Number(digits))));
            }}
            className="h-7 w-14 rounded-[min(var(--radius-md),10px)] border border-input bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button size="icon-sm" onClick={handleAdd} disabled={!addProjectId} aria-label="Add allocation">
            <Plus className="size-3.5" />
          </Button>
        </div>

        <p className={cn("mt-3 rounded-lg px-2.5 py-1.5 text-center text-xs font-medium", styles.badge)}>
          Total: {total}% allocated
        </p>
      </PopoverContent>
    </Popover>
  );
}
