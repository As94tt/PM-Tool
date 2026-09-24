import { cn } from "@/lib/utils";
import type { SkillLevel } from "@/lib/types";

const LEVEL_STYLES: Record<SkillLevel, string> = {
  1: "bg-primary/15 text-foreground/70",
  2: "bg-primary/30 text-foreground/80",
  3: "bg-primary/50 text-foreground",
  4: "bg-primary/75 text-primary-foreground",
  5: "bg-primary text-primary-foreground",
};

export function SkillLevelCell({ level }: { level?: SkillLevel }) {
  if (!level) {
    return <span className="flex size-7 items-center justify-center text-border">–</span>;
  }
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
        LEVEL_STYLES[level]
      )}
    >
      {level}
    </span>
  );
}
