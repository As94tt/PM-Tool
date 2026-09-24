import type {
  Person,
  PersonSkill,
  PersonCertification,
  Skill,
  Certification,
  Project,
  ProjectMember,
  ProjectSkill,
  ResourceAllocation,
  BudgetPlan,
  SkillLevel,
  ProjectStatus,
  Client,
  Department,
} from "@/lib/types";
import { getAllocationForPersonMonth, getHorizonMonths } from "./capacity";

/** Clients are matched to projects by exact name, not a foreign key. */
export function getClientByName(clients: Client[], clientName: string): Client | undefined {
  return clients.find((c) => c.name === clientName);
}

export function getProjectsForClient(projects: Project[], clientName: string): Project[] {
  return projects.filter((p) => p.clientName === clientName);
}

export function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`;
}

export function initials(person: Person): string {
  return `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
}

export interface PersonSkillDetail {
  skill: Skill;
  level: SkillLevel;
}

export function getPersonSkillDetails(
  personSkills: PersonSkill[],
  skills: Skill[],
  personId: string
): PersonSkillDetail[] {
  return personSkills
    .filter((ps) => ps.personId === personId)
    .map((ps) => {
      const skill = skills.find((s) => s.id === ps.skillId);
      return skill ? { skill, level: ps.level } : null;
    })
    .filter((d): d is PersonSkillDetail => d !== null)
    .toSorted((a, b) => b.level - a.level || a.skill.name.localeCompare(b.skill.name));
}

export interface PersonCertificationDetail {
  certification: Certification;
  issuedDate: string;
  expiryDate?: string;
}

export function getPersonCertificationDetails(
  personCertifications: PersonCertification[],
  certifications: Certification[],
  personId: string
): PersonCertificationDetail[] {
  return personCertifications
    .filter((pc) => pc.personId === personId)
    .map((pc): PersonCertificationDetail | null => {
      const certification = certifications.find((c) => c.id === pc.certificationId);
      if (!certification) return null;
      return { certification, issuedDate: pc.issuedDate, expiryDate: pc.expiryDate };
    })
    .filter((d): d is PersonCertificationDetail => d !== null)
    .toSorted((a, b) => b.issuedDate.localeCompare(a.issuedDate));
}

export interface PersonProjectsSplit {
  current: Project[];
  upcoming: Project[];
  previous: Project[];
}

export function getPersonProjectsSplit(
  projectMembers: ProjectMember[],
  projects: Project[],
  personId: string
): PersonProjectsSplit {
  const memberProjectIds = new Set(
    projectMembers.filter((pm) => pm.personId === personId).map((pm) => pm.projectId)
  );
  const memberProjects = projects.filter((p) => memberProjectIds.has(p.id));
  return {
    current: memberProjects.filter((p) => p.status === "active"),
    upcoming: memberProjects.filter((p) => p.status === "planned"),
    previous: memberProjects
      .filter((p) => p.status === "completed")
      .toSorted((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? "")),
  };
}

export interface ProjectMemberDetail {
  person: Person;
  roleOnProject: string;
}

export function getProjectMemberDetails(
  projectMembers: ProjectMember[],
  people: Person[],
  projectId: string
): ProjectMemberDetail[] {
  return projectMembers
    .filter((pm) => pm.projectId === projectId)
    .map((pm) => {
      const person = people.find((p) => p.id === pm.personId);
      return person ? { person, roleOnProject: pm.roleOnProject } : null;
    })
    .filter((d): d is ProjectMemberDetail => d !== null);
}

export function getProjectSkillDetails(
  projectSkills: ProjectSkill[],
  skills: Skill[],
  projectId: string
): Skill[] {
  const ids = new Set(projectSkills.filter((ps) => ps.projectId === projectId).map((ps) => ps.skillId));
  return skills.filter((s) => ids.has(s.id));
}

export function getSimilarProjects(
  projects: Project[],
  projectSkills: ProjectSkill[],
  projectId: string,
  limit = 3
): Project[] {
  const base = projects.find((p) => p.id === projectId);
  if (!base) return [];
  const baseSkillIds = new Set(
    projectSkills.filter((ps) => ps.projectId === projectId).map((ps) => ps.skillId)
  );
  return projects
    .filter((p) => p.id !== projectId)
    .map((p) => {
      const pSkillIds = projectSkills.filter((ps) => ps.projectId === p.id).map((ps) => ps.skillId);
      const overlap = pSkillIds.filter((id) => baseSkillIds.has(id)).length;
      const sameIndustry = p.industryId === base.industryId ? 1 : 0;
      return { project: p, score: overlap * 2 + sameIndustry };
    })
    .filter((s) => s.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.project);
}

export interface SkillDiscoveryResult {
  person: Person;
  level: SkillLevel;
  availabilityPercent: number;
  relevantProjects: Project[];
}

export function discoverPeopleBySkill(params: {
  people: Person[];
  personSkills: PersonSkill[];
  projectMembers: ProjectMember[];
  projects: Project[];
  resourceAllocations: ResourceAllocation[];
  skillId: string;
  minLevel?: SkillLevel;
  minAvailabilityPercent?: number;
  month?: string;
}): SkillDiscoveryResult[] {
  const {
    people,
    personSkills,
    projectMembers,
    projects,
    resourceAllocations,
    skillId,
    minLevel = 1,
    minAvailabilityPercent = 0,
    month,
  } = params;
  const targetMonth = month ?? getHorizonMonths(1)[0];

  return personSkills
    .filter((ps) => ps.skillId === skillId && ps.level >= minLevel)
    .map((ps) => {
      const person = people.find((p) => p.id === ps.personId);
      if (!person) return null;
      const allocated = getAllocationForPersonMonth(resourceAllocations, person.id, targetMonth);
      const availabilityPercent = Math.max(0, 100 - allocated);
      const relevantProjects = projectMembers
        .filter((pm) => pm.personId === person.id)
        .map((pm) => projects.find((p) => p.id === pm.projectId))
        .filter((p): p is Project => !!p && p.status === "active");
      return { person, level: ps.level, availabilityPercent, relevantProjects };
    })
    .filter((r): r is SkillDiscoveryResult => r !== null && r.availabilityPercent >= minAvailabilityPercent)
    .toSorted((a, b) => b.level - a.level || b.availabilityPercent - a.availabilityPercent);
}

export interface AvailabilitySoon {
  person: Person;
  currentAllocation: number;
  freeFromMonth: string;
  futureAllocation: number;
}

export function getPeopleBecomingAvailableSoon(
  people: Person[],
  resourceAllocations: ResourceAllocation[],
  opts: { withinMonths?: number; freeThreshold?: number } = {}
): AvailabilitySoon[] {
  const { withinMonths = 3, freeThreshold = 50 } = opts;
  const months = getHorizonMonths(withinMonths + 1);
  const currentMonth = months[0];
  const result: AvailabilitySoon[] = [];
  for (const person of people) {
    const currentAllocation = getAllocationForPersonMonth(resourceAllocations, person.id, currentMonth);
    if (currentAllocation < freeThreshold) continue;
    for (let i = 1; i < months.length; i++) {
      const futureAllocation = getAllocationForPersonMonth(resourceAllocations, person.id, months[i]);
      if (futureAllocation < freeThreshold) {
        result.push({ person, currentAllocation, freeFromMonth: months[i], futureAllocation });
        break;
      }
    }
  }
  return result.toSorted((a, b) => a.freeFromMonth.localeCompare(b.freeFromMonth));
}

export interface PeopleFilters {
  query?: string;
  locationId?: string;
  department?: Department;
  skillId?: string;
  minSkillLevel?: SkillLevel;
  certificationId?: string;
  minAvailabilityPercent?: number;
  currentProjectId?: string;
  industryId?: string;
}

export function filterPeople(params: {
  people: Person[];
  personSkills: PersonSkill[];
  personCertifications: PersonCertification[];
  projectMembers: ProjectMember[];
  resourceAllocations: ResourceAllocation[];
  filters: PeopleFilters;
}): Person[] {
  const { people, personSkills, personCertifications, projectMembers, resourceAllocations, filters } = params;
  const month = getHorizonMonths(1)[0];
  const q = filters.query?.trim().toLowerCase();

  return people.filter((p) => {
    if (q && !`${fullName(p)} ${p.jobTitle}`.toLowerCase().includes(q)) return false;
    if (filters.locationId && p.locationId !== filters.locationId) return false;
    if (filters.department && p.department !== filters.department) return false;
    if (filters.industryId && !p.industryExperienceIds.includes(filters.industryId)) return false;

    if (filters.skillId) {
      const match = personSkills.find((ps) => ps.personId === p.id && ps.skillId === filters.skillId);
      if (!match) return false;
      if (filters.minSkillLevel && match.level < filters.minSkillLevel) return false;
    }

    if (filters.certificationId) {
      const hasCert = personCertifications.some(
        (pc) => pc.personId === p.id && pc.certificationId === filters.certificationId
      );
      if (!hasCert) return false;
    }

    if (filters.currentProjectId) {
      const onProject = projectMembers.some(
        (pm) => pm.personId === p.id && pm.projectId === filters.currentProjectId
      );
      if (!onProject) return false;
    }

    if (filters.minAvailabilityPercent !== undefined) {
      const allocated = getAllocationForPersonMonth(resourceAllocations, p.id, month);
      const availability = Math.max(0, 100 - allocated);
      if (availability < filters.minAvailabilityPercent) return false;
    }

    return true;
  });
}

export interface ProjectFilters {
  query?: string;
  status?: ProjectStatus;
  industryId?: string;
  skillId?: string;
  clientName?: string;
}

export function filterProjects(params: {
  projects: Project[];
  projectSkills: ProjectSkill[];
  filters: ProjectFilters;
}): Project[] {
  const { projects, projectSkills, filters } = params;
  const q = filters.query?.trim().toLowerCase();

  return projects.filter((p) => {
    if (q && !`${p.name} ${p.clientName} ${p.shortDescription}`.toLowerCase().includes(q)) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.industryId && p.industryId !== filters.industryId) return false;
    if (filters.clientName && p.clientName !== filters.clientName) return false;
    if (filters.skillId && !projectSkills.some((ps) => ps.projectId === p.id && ps.skillId === filters.skillId))
      return false;
    return true;
  });
}

export function getProjectMemberAllocationAverage(
  resourceAllocations: ResourceAllocation[],
  projectId: string,
  personId: string
): number {
  const rows = resourceAllocations.filter((a) => a.projectId === projectId && a.personId === personId);
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, r) => sum + r.allocationPercent, 0) / rows.length);
}

export function getDashboardStats(
  people: Person[],
  projects: Project[],
  skills: Skill[],
  resourceAllocations: ResourceAllocation[]
) {
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const plannedProjects = projects.filter((p) => p.status === "planned").length;
  const currentMonth = getHorizonMonths(1)[0];
  const avgAllocated = people.length
    ? people.reduce(
        (sum, p) => sum + Math.min(100, getAllocationForPersonMonth(resourceAllocations, p.id, currentMonth)),
        0
      ) / people.length
    : 0;
  return {
    peopleCount: people.length,
    activeProjects,
    plannedProjects,
    skillsCount: skills.length,
    availableCapacityPercent: Math.max(0, Math.round(100 - avgAllocated)),
  };
}

export interface BudgetOverview {
  totalBudget: number;
  totalPlannedPersonnelCost: number;
  monthlyTotals: { month: string; plannedCost: number }[];
}

export function getBudgetOverview(projects: Project[], budgetPlans: BudgetPlan[]): BudgetOverview {
  const totalBudget = projects.reduce((s, p) => s + p.totalBudget, 0);
  const totalPlannedPersonnelCost = budgetPlans.reduce((s, b) => s + b.plannedPersonnelCost, 0);
  const horizon = getHorizonMonths(12);
  const monthlyTotals = horizon.map((month) => ({
    month,
    plannedCost: budgetPlans.reduce(
      (sum, b) => sum + (b.monthlyPlannedCost.find((m) => m.month === month)?.plannedCost ?? 0),
      0
    ),
  }));
  return { totalBudget, totalPlannedPersonnelCost, monthlyTotals };
}
