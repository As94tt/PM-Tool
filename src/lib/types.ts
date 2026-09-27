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

/** The catalog of allowed job-title values for Person.jobTitle — an admin-
 * managed master-data list, like Skill/Interest/Certification, rather than
 * free text. */
export interface Role {
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

export type LanguageProficiency = "Native" | "Fluent" | "Professional" | "Conversational" | "Basic";

export interface PersonLanguage {
  name: string;
  proficiency: LanguageProficiency;
}

export const LANGUAGE_PROFICIENCIES: LanguageProficiency[] = [
  "Native",
  "Fluent",
  "Professional",
  "Conversational",
  "Basic",
];

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
  languages: PersonLanguage[];
  /** Short, personal selling points for a staffing proposal — e.g.
   * "Stakeholder management", "Cost optimization" — distinct from Skills,
   * which are a shared catalog with proficiency levels. Free text per
   * person, not a shared vocabulary. */
  projectStrengths: string[];
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
  /** Free text describing this person's own contribution on this project
   * ("what I did") — shown on their CV. Optional; falls back to the
   * project's own shortDescription when not filled in. Dates for this
   * membership are deliberately not stored here — they're derived from
   * ResourceAllocation (the months this person actually had FTE on the
   * project), not typed in by hand. */
  contributionDescription?: string;
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

/** A single planned seat on a project's staffing plan — the "demand" side
 * of project-level resource & budget planning. One row = one seat, with
 * FTE between 0 and 1 per week; needing two Business Analysts means two
 * separate rows both named "Business Analyst", not one row at FTE 2. FTE
 * is tracked per week (keyed by that week's Monday, "YYYY-MM-DD") since
 * staffing plans are typically drawn up at finer grain than the app's
 * month-based allocation grid. */
export interface ProjectRoleRequirement {
  id: string;
  projectId: string;
  roleName: string;
  dayRate: number;
  ftePerWeek: Record<string, number>;
}

/** The real person filling one required seat — at most one assignment per
 * ProjectRoleRequirement. Carries its own day rate (may differ from the
 * seat's planned rate — this is what makes a "blended rate" meaningful);
 * FTE is *not* stored here — it's the linked requirement's ftePerWeek,
 * since an assignment fills a specific seat rather than tracking its own
 * independent schedule. Weekly cost = requirement.ftePerWeek[week] *
 * assignment.dayRate * 5, so plan and actual never drift apart by
 * construction. */
export interface ProjectRoleAssignment {
  id: string;
  projectId: string;
  roleRequirementId: string;
  personId: string;
  dayRate: number;
}

export type AllocationStatus =
  | "underallocated"
  | "partial"
  | "full"
  | "overallocated";

export type FeedbackType = "bug" | "feature";

/** A sticky note on the Bugs & Requests board — informal feedback from
 * anyone using the platform, not a full ticketing system. */
export interface FeedbackNote {
  id: string;
  type: FeedbackType;
  text: string;
  authorPersonId: string;
  createdAt: string; // ISO datetime
  /** Person IDs who've upvoted this note — one vote per person, toggled on/off. */
  votedByPersonIds: string[];
}

export interface Dataset {
  locations: Location[];
  industries: Industry[];
  skills: Skill[];
  certifications: Certification[];
  interests: Interest[];
  roles: Role[];
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
  projectRoleRequirements: ProjectRoleRequirement[];
  projectRoleAssignments: ProjectRoleAssignment[];
  feedbackNotes: FeedbackNote[];
}
