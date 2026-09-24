import Link from "next/link";
import { MapPin, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DepartmentBadge } from "@/components/shared/department-badge";
import type { Person, Location } from "@/lib/types";
import { fullName, initials, type PersonSkillDetail } from "@/lib/data/queries";
import { getAllocationStatus, ALLOCATION_STATUS_STYLES, ALLOCATION_STATUS_LABEL } from "@/lib/data/capacity";
import { cn } from "@/lib/utils";

export function PersonCard({
  person,
  location,
  topSkills,
  certificationCount,
  availabilityPercent,
}: {
  person: Person;
  location?: Location;
  topSkills: PersonSkillDetail[];
  certificationCount: number;
  availabilityPercent: number;
}) {
  const status = getAllocationStatus(100 - availabilityPercent);
  const styles = ALLOCATION_STATUS_STYLES[status];

  return (
    <Link
      href={`/people/${person.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-elevation-1 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-12 shrink-0 ring-2 ring-background">
          <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
          <AvatarFallback>{initials(person)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold text-foreground group-hover:text-primary">
            {fullName(person)}
          </p>
          <p className="truncate text-xs text-muted-foreground">{person.jobTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/80">
                <MapPin className="size-3" /> {location.city}
              </span>
            )}
            <DepartmentBadge department={person.department} className="text-muted-foreground/80" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {topSkills.slice(0, 3).map(({ skill }) => (
          <Badge key={skill.id} variant="secondary" className="font-normal">
            {skill.name}
          </Badge>
        ))}
        {topSkills.length > 3 && (
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            +{topSkills.length - 3}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Award className="size-3.5" /> {certificationCount} certification{certificationCount === 1 ? "" : "s"}
        </span>
        <span
          className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", styles.badge)}
          title={ALLOCATION_STATUS_LABEL[status]}
        >
          <span className={cn("size-1.5 rounded-full", styles.dot)} />
          {availabilityPercent}% free
        </span>
      </div>
    </Link>
  );
}
