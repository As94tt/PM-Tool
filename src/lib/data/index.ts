import type {
  Location,
  Industry,
  Skill,
  Certification,
  Interest,
  User,
  Person,
  PersonSkill,
  PersonCertification,
  Project,
  ProjectMember,
  ProjectSkill,
  ResourceAllocation,
  BudgetPlan,
  Client,
} from "@/lib/types";

import locationsJson from "./generated/locations.json";
import industriesJson from "./generated/industries.json";
import skillsJson from "./generated/skills.json";
import certificationsJson from "./generated/certifications.json";
import interestsJson from "./generated/interests.json";
import usersJson from "./generated/users.json";
import peopleJson from "./generated/people.json";
import personSkillsJson from "./generated/person-skills.json";
import personCertificationsJson from "./generated/person-certifications.json";
import clientsJson from "./generated/clients.json";
import projectsJson from "./generated/projects.json";
import projectMembersJson from "./generated/project-members.json";
import projectSkillsJson from "./generated/project-skills.json";
import resourceAllocationsJson from "./generated/resource-allocations.json";
import budgetPlansJson from "./generated/budget-plans.json";

export const INITIAL_LOCATIONS = locationsJson as Location[];
export const INITIAL_INDUSTRIES = industriesJson as Industry[];
export const INITIAL_SKILLS = skillsJson as Skill[];
export const INITIAL_CERTIFICATIONS = certificationsJson as Certification[];
export const INITIAL_INTERESTS = interestsJson as Interest[];
export const INITIAL_USERS = usersJson as User[];
export const INITIAL_PEOPLE = peopleJson as Person[];
export const INITIAL_PERSON_SKILLS = personSkillsJson as PersonSkill[];
export const INITIAL_PERSON_CERTIFICATIONS = personCertificationsJson as PersonCertification[];
export const INITIAL_CLIENTS = clientsJson as Client[];
export const INITIAL_PROJECTS = projectsJson as Project[];
export const INITIAL_PROJECT_MEMBERS = projectMembersJson as ProjectMember[];
export const INITIAL_PROJECT_SKILLS = projectSkillsJson as ProjectSkill[];
export const INITIAL_RESOURCE_ALLOCATIONS = resourceAllocationsJson as ResourceAllocation[];
export const INITIAL_BUDGET_PLANS = budgetPlansJson as BudgetPlan[];

export function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((i) => [i.id, i]));
}
