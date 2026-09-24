// Core relational data model for the internal company platform.
// Entities mirror the spec: User, Person, Skill, PersonSkill, Certification,
// PersonCertification, Interest, Project, ProjectMember, ProjectSkill,
// ResourceAllocation, BudgetPlan, plus Industry / Location / Role.

export type AppRole = "user" | "management" | "admin";

export interface Location {
  id: string;
  city: string;
  country: string;
  region: string;
}

export interface Industry {
  id: string;
  name: string;
}

export type SkillCategory =
  | "Cloud"
  | "Software Development"
  | "Data & AI"
  | "Telco"
  | "Infrastructure"
  | "Cybersecurity"
  | "Project Management"
  | "Business"
  | "Sales"
  | "Design / UX";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description?: string;
}

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface PersonSkill {
  personId: string;
  skillId: string;
  level: SkillLevel;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
}

export interface PersonCertification {
  personId: string;
  certificationId: string;
  issuedDate: string; // ISO date
  expiryDate?: string; // ISO date
}

export interface Interest {
  id: string;
  name: string;
}

export interface User {
  id: string;
  personId: string;
  email: string;
  role: AppRole;
}

export type Department = "IT Solutions" | "Development" | "Data" | "5G";

export const DEPARTMENTS: Department[] = ["IT Solutions", "Development", "Data", "5G"];

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  jobTitle: string;
  department: Department;
  locationId: string;
  bio: string;
  interestIds: string[];
  industryExperienceIds: string[];
  joinedDate: string; // ISO date
}

export type ProjectStatus = "planned" | "active" | "completed";

export interface Project {
  id: string;
  name: string;
  clientName: string;
  industryId: string;
  shortDescription: string;
  projectType: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string | null; // null = ongoing
  status: ProjectStatus;
  leadPersonId: string;
  /** Optional — the person accountable for day-to-day delivery, distinct from the project lead. */
  deliveryResponsiblePersonId?: string;
  outcomes: string[];
  currency: string;
  totalBudget: number;
  /** Optional project picture (data URL or external URL). Shown instead of the
   * client logo wherever a project's visual identifier appears. */
  imageUrl?: string;
}

/** A client company. Matched to Project.clientName by exact name (not a
 * foreign key) so existing free-text client names keep working. */
export interface Client {
  id: string;
  name: string;
  industryId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  /** Company logo (data URL or external URL). Falls back to a generated
   * initials badge when unset. */
  logoUrl?: string;
}

export interface ProjectMember {
  projectId: string;
  personId: string;
  roleOnProject: string;
}

export interface ProjectSkill {
  projectId: string;
  skillId: string;
}

/** One person's allocation to one project for one calendar month ("YYYY-MM"). */
export interface ResourceAllocation {
  id: string;
  personId: string;
  projectId: string;
  month: string; // "YYYY-MM"
  allocationPercent: number;
}

export interface BudgetMonth {
  month: string; // "YYYY-MM"
  plannedCost: number;
}

export interface BudgetPlan {
  projectId: string;
  plannedPersonnelCost: number;
  monthlyPlannedCost: BudgetMonth[];
}

export type AllocationStatus =
  | "underallocated"
  | "healthy"
  | "full"
  | "overallocated";

export interface Dataset {
  locations: Location[];
  industries: Industry[];
  skills: Skill[];
  certifications: Certification[];
  interests: Interest[];
  users: User[];
  people: Person[];
  personSkills: PersonSkill[];
  personCertifications: PersonCertification[];
  clients: Client[];
  projects: Project[];
  projectMembers: ProjectMember[];
  projectSkills: ProjectSkill[];
  resourceAllocations: ResourceAllocation[];
  budgetPlans: BudgetPlan[];
}
