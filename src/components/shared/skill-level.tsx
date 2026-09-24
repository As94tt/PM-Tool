import { cn } from "@/lib/utils";
import type { SkillLevel } from "@/lib/types";

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  1: "Basic Knowledge",
  2: "Beginner",
  3: "Working Knowledge",
  4: "Advanced",
  5: "Expert",
};

export function SkillLevelDots({
  level,
  className,
}: {
  level: SkillLevel | number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            n <= level ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </span>
  );
}
