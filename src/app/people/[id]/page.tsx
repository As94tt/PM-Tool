"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Mail, CalendarDays, Award, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { useCurrentPerson } from "@/store/hooks";
import {
  fullName,
  initials,
  getPersonSkillDetails,
  getPersonCertificationDetails,
  getPersonProjectsSplit,
} from "@/lib/data/queries";
import {
  getHorizonMonths,
  getAllocationForPersonMonth,
  getAllocationStatus,
  ALLOCATION_STATUS_STYLES,
  ALLOCATION_STATUS_LABEL,
} from "@/lib/data/capacity";
import { formatDate } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkillLevelDots, SKILL_LEVEL_LABEL } from "@/components/shared/skill-level";
import { ProjectMiniCard } from "@/components/projects/project-mini-card";
import { EditProfileSheet } from "@/components/people/edit-profile-sheet";
import { cn } from "@/lib/utils";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();

  const people = useAppStore((s) => s.people);
  const users = useAppStore((s) => s.users);
  const locations = useAppStore((s) => s.locations);
  const industries = useAppStore((s) => s.industries);
  const interests = useAppStore((s) => s.interests);
  const skills = useAppStore((s) => s.skills);
  const certifications = useAppStore((s) => s.certifications);
  const personSkills = useAppStore((s) => s.personSkills);
  const personCertifications = useAppStore((s) => s.personCertifications);
  const projectMembers = useAppStore((s) => s.projectMembers);
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const resourceAllocations = useAppStore((s) => s.resourceAllocations);
  const role = useAppStore((s) => s.viewAsRole);
  const currentPerson = useCurrentPerson();

  const person = people.find((p) => p.id === id);

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="font-heading text-lg font-semibold">Person not found</p>
        <Link href="/people" className="text-sm text-primary hover:underline">
          Back to People
        </Link>
      </div>
    );
  }

  const location = locations.find((l) => l.id === person.locationId);
  const user = users.find((u) => u.personId === person.id);
  const mySkills = getPersonSkillDetails(personSkills, skills, person.id);
  const myCerts = getPersonCertificationDetails(personCertifications, certifications, person.id);
  const myInterests = interests.filter((i) => person.interestIds.includes(i.id));
  const myIndustries = industries.filter((i) => person.industryExperienceIds.includes(i.id));
  const { current, upcoming, previous } = getPersonProjectsSplit(projectMembers, projects, person.id);

  const horizon = getHorizonMonths(6);
  const currentAllocation = getAllocationForPersonMonth(resourceAllocations, person.id, horizon[0]);
  const availabilityPercent = Math.max(0, 100 - currentAllocation);
  const status = getAllocationStatus(currentAllocation);
  const styles = ALLOCATION_STATUS_STYLES[status];

  let upcomingChange: { month: string; availability: number } | null = null;
  for (let i = 1; i < horizon.length; i++) {
    const alloc = getAllocationForPersonMonth(resourceAllocations, person.id, horizon[i]);
    const avail = Math.max(0, 100 - alloc);
    if (Math.abs(avail - availabilityPercent) >= 15) {
      upcomingChange = { month: horizon[i], availability: avail };
      break;
    }
  }

  const canEdit = role === "admin" || currentPerson.id === person.id;

  const skillsByCategory = new Map<string, typeof mySkills>();
  for (const detail of mySkills) {
    const list = skillsByCategory.get(detail.skill.category) ?? [];
    list.push(detail);
    skillsByCategory.set(detail.skill.category, list);
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <Link href="/people" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to People
      </Link>

      <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 shadow-elevation-1 sm:flex-row sm:items-center">
        <Avatar className="size-20 ring-4 ring-background shadow-elevation-2">
          <AvatarImage src={person.avatarUrl} alt={fullName(person)} />
          <AvatarFallback className="text-lg">{initials(person)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{fullName(person)}</h1>
            <span
              className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", styles.badge)}
            >
              <span className={cn("size-1.5 rounded-full", styles.dot)} />
              {availabilityPercent}% available
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{person.jobTitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {location.city}, {location.country}
              </span>
            )}
            {user && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {user.email}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> Joined {formatDate(person.joinedDate)}
            </span>
          </div>
        </div>
        {canEdit && <EditProfileSheet person={person} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-6 shadow-elevation-1">
            <h2 className="font-heading text-base font-semibold">About</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{person.bio}</p>
            {myIndustries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {myIndustries.map((i) => (
                  <Badge key={i.id} variant="secondary" className="font-normal">
                    {i.name}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-elevation-1">
            <h2 className="font-heading text-base font-semibold">Skills</h2>
            <div className="mt-4 flex flex-col gap-5">
              {Array.from(skillsByCategory.entries()).map(([category, details]) => (
                <div key={category}>
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{category}</p>
                  <div className="flex flex-col gap-2">
                    {details.map(({ skill, level }) => (
                      <div key={skill.id} className="flex items-center gap-3 text-sm">
                        <span className="w-48 shrink-0 truncate">{skill.name}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <SkillLevelDots level={level} />
                          <span>{SKILL_LEVEL_LABEL[level]}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {mySkills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
            </div>
          </Card>

          {current.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-base font-semibold">Current projects</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {current.map((p) => (
                  <ProjectMiniCard key={p.id} project={p} clients={clients} />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-base font-semibold">Upcoming projects</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {upcoming.map((p) => (
                  <ProjectMiniCard key={p.id} project={p} clients={clients} />
                ))}
              </div>
            </section>
          )}

          {previous.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-base font-semibold">Previous projects</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {previous.map((p) => (
                  <ProjectMiniCard key={p.id} project={p} clients={clients} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5 shadow-elevation-1">
            <h2 className="font-heading text-sm font-semibold">Availability</h2>
            <p className="mt-3 font-heading text-3xl font-semibold">{availabilityPercent}%</p>
            <p className="text-xs text-muted-foreground">{ALLOCATION_STATUS_LABEL[status]} this month</p>
            {upcomingChange && (
              <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                Expected to shift to <span className="font-medium text-foreground">{upcomingChange.availability}%</span>{" "}
                available around {formatDate(`${upcomingChange.month}-01`)}.
              </p>
            )}
          </Card>

          <Card className="p-5 shadow-elevation-1">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
              <Award className="size-4" /> Certifications
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {myCerts.map(({ certification, issuedDate }) => (
                <div key={certification.id}>
                  <p className="text-sm font-medium">{certification.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {certification.issuer} · {formatDate(issuedDate)}
                  </p>
                </div>
              ))}
              {myCerts.length === 0 && <p className="text-sm text-muted-foreground">No certifications yet.</p>}
            </div>
          </Card>

          <Card className="p-5 shadow-elevation-1">
            <h2 className="font-heading text-sm font-semibold">Interests</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {myInterests.map((i) => (
                <Badge key={i.id} variant="secondary" className="font-normal">
                  {i.name}
                </Badge>
              ))}
              {myInterests.length === 0 && <p className="text-sm text-muted-foreground">No interests added yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
