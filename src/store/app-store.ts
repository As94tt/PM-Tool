import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  AppRole,
  Person,
  PersonSkill,
  PersonCertification,
  Project,
  ProjectMember,
  ProjectSkill,
  ResourceAllocation,
  BudgetPlan,
  SkillLevel,
  Skill,
  Client,
  Location,
  Certification,
  Interest,
  Role,
  User,
  ProjectRoleRequirement,
  ProjectRoleAssignment,
  FeedbackNote,
  FeedbackType,
} from "@/lib/types";
import { APP_FUNCTIONS, DEFAULT_PERMISSIONS, type PermissionLevel, type PermissionMatrix } from "@/lib/permissions";
import { monthToDate } from "@/lib/data/capacity";
import { startOfWeek, weekKey, addWeeks, getHorizonWeeks } from "@/lib/data/week-planning";
import {
  INITIAL_LOCATIONS,
  INITIAL_INDUSTRIES,
  INITIAL_SKILLS,
  INITIAL_CERTIFICATIONS,
  INITIAL_INTERESTS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_PEOPLE,
  INITIAL_PERSON_SKILLS,
  INITIAL_PERSON_CERTIFICATIONS,
  INITIAL_CLIENTS,
  INITIAL_PROJECTS,
  INITIAL_PROJECT_MEMBERS,
  INITIAL_PROJECT_SKILLS,
  INITIAL_RESOURCE_ALLOCATIONS,
  INITIAL_BUDGET_PLANS,
  INITIAL_PROJECT_ROLE_REQUIREMENTS,
  INITIAL_PROJECT_ROLE_ASSIGNMENTS,
} from "@/lib/data";

export interface AppState {
  // session (architecturally stands in for a real auth provider / SSO claim)
  currentUserId: string;
  viewAsRole: AppRole;

  // reference data (static for the PoC, but modelled as state so Admin CRUD is possible later)
  locations: typeof INITIAL_LOCATIONS;
  industries: typeof INITIAL_INDUSTRIES;
  skills: typeof INITIAL_SKILLS;
  certifications: typeof INITIAL_CERTIFICATIONS;
  interests: typeof INITIAL_INTERESTS;
  roles: typeof INITIAL_ROLES;
  users: typeof INITIAL_USERS;
  /** Admin-editable see/edit/hide matrix per app function and role — see lib/permissions.ts. */
  permissions: PermissionMatrix;

  // core entities
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

  // actions
  setViewAsRole: (role: AppRole) => void;
  setCurrentUser: (personId: string) => void;

  updatePerson: (personId: string, patch: Partial<Person>) => void;
  setPersonSkillLevel: (personId: string, skillId: string, level: SkillLevel) => void;
  removePersonSkill: (personId: string, skillId: string) => void;
  addPersonCertification: (entry: PersonCertification) => void;
  removePersonCertification: (personId: string, certificationId: string) => void;

  createProject: (project: Project, members: ProjectMember[], skillIds: string[]) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  setProjectTeam: (projectId: string, members: Omit<ProjectMember, "projectId">[]) => void;
  setProjectSkills: (projectId: string, skillIds: string[]) => void;
  addProjectMembership: (personId: string, projectId: string, roleOnProject: string) => void;
  removeProjectMembership: (personId: string, projectId: string) => void;
  updateProjectMemberContribution: (personId: string, projectId: string, contributionDescription: string) => void;

  addClient: (client: Client) => void;
  updateClient: (clientId: string, patch: Partial<Client>) => void;
  removeClient: (clientId: string) => void;

  upsertAllocation: (allocation: Omit<ResourceAllocation, "id"> & { id?: string }) => void;
  removeAllocation: (allocationId: string) => void;
  assignToProject: (params: {
    personId: string;
    projectId: string;
    month: string;
    allocationPercent: number;
    roleOnProject?: string;
  }) => void;

  importPeople: (people: Person[]) => void;
  importProjects: (projects: Project[]) => void;
  addSkill: (skill: { id: string; name: string; category: Skill["category"]; description?: string }) => void;
  removeSkill: (skillId: string) => void;

  addLocation: (location: Omit<Location, "id">) => void;
  removeLocation: (locationId: string) => void;
  addCertification: (certification: Omit<Certification, "id">) => void;
  removeCertification: (certificationId: string) => void;
  addInterest: (interest: Omit<Interest, "id">) => void;
  removeInterest: (interestId: string) => void;
  addRole: (role: Omit<Role, "id">) => void;
  removeRole: (roleId: string) => void;

  addRoleRequirement: (requirement: { projectId: string; roleName: string; dayRate: number }) => void;
  removeRoleRequirement: (requirementId: string) => void;
  updateRoleRequirementDayRate: (requirementId: string, dayRate: number) => void;
  setRoleRequirementWeekFte: (requirementId: string, week: string, fte: number) => void;

  addRoleAssignment: (assignment: {
    projectId: string;
    roleRequirementId: string;
    personId: string;
    dayRate: number;
  }) => void;
  removeRoleAssignment: (assignmentId: string) => void;
  updateRoleAssignmentDayRate: (assignmentId: string, dayRate: number) => void;

  addFeedbackNote: (note: { type: FeedbackType; text: string; authorPersonId: string }) => void;
  removeFeedbackNote: (noteId: string) => void;
  toggleFeedbackVote: (noteId: string, personId: string) => void;

  /** Creates a login/role record for a person — called right when a new
   * person is added, so "every new registration gets role User" holds. */
  addUser: (user: { personId: string; email: string; role: AppRole }) => void;
  /** Admin's "change this person's role" action. Updates their existing
   * User record, or creates one (with a synthesized email) if they
   * somehow don't have one yet — e.g. a CSV-imported or legacy person. */
  setPersonRole: (personId: string, role: AppRole) => void;
  setPermission: (functionKey: string, role: AppRole, level: PermissionLevel) => void;
}

function nextId(prefix: string, existingIds: string[]) {
  let n = existingIds.length + 1;
  let id = `${prefix}-${n}`;
  while (existingIds.includes(id)) {
    n += 1;
    id = `${prefix}-${n}`;
  }
  return id;
}

/** Fallback email for a person who needs a User record but wasn't given one
 * explicitly (CSV import, or self-healing a legacy person with none at all). */
function synthesizeEmail(person: Person): string {
  return `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase().replace(/[^a-z]/g, "")}@nexuscorp.example`;
}

/** Converts a person's monthly ResourceAllocation rows on a project into a
 * weekly FTE map, for backfilling a staffing-plan seat that never existed —
 * grounded in the real (if approximate) monthly numbers instead of a guess.
 * Falls back to a flat 8-week/100% placeholder when there's no allocation
 * history at all to derive from (e.g. a membership added by hand). */
function deriveFtePerWeekFromAllocations(
  allocations: ResourceAllocation[],
  personId: string,
  projectId: string
): Record<string, number> {
  const rows = allocations.filter(
    (a) => a.personId === personId && a.projectId === projectId && a.allocationPercent > 0
  );
  const ftePerWeek: Record<string, number> = {};
  if (rows.length === 0) {
    for (const week of getHorizonWeeks(8)) ftePerWeek[week] = 1;
    return ftePerWeek;
  }
  for (const row of rows) {
    const monthStart = monthToDate(row.month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const fte = Math.round((row.allocationPercent / 100) * 20) / 20;
    let cursor = startOfWeek(monthStart);
    while (cursor <= monthEnd) {
      ftePerWeek[weekKey(cursor)] = fte;
      cursor = addWeeks(cursor, 1);
    }
  }
  return ftePerWeek;
}

/**
 * Runs on every rehydration (page load) to keep the persisted state
 * internally consistent, self-healing two classes of drift that can build
 * up in a browser's localStorage over time as the app evolves:
 *  1. A person saved before a field existed (e.g. `languages`,
 *     `projectStrengths`) won't have it — code that assumes it's always an
 *     array (like the PDF export) would otherwise crash.
 *  2. Rows that reference a person/project that no longer exists (e.g.
 *     after a demo-data regeneration), or an allocation/staffing-plan
 *     entry for a person+project pair with no matching ProjectMember —
 *     ProjectMember is meant to be the single source of truth for "is this
 *     person on this project," so anything implying membership should
 *     always have a matching row there.
 *  3. The reverse of #2: a ProjectMember with no staffing-plan seat at all
 *     (no ProjectRoleAssignment), which used to happen for any project
 *     whose demo data predated the staffing-plan feature (or, before this
 *     fix, for completed projects specifically — see generate-data.mjs).
 *     Backfills a requirement + assignment so "on the team" and "planned"
 *     never drift apart in either direction.
 */
function repairState(state: AppState): AppState {
  const peopleIds = new Set(state.people.map((p) => p.id));
  const projectIds = new Set(state.projects.map((p) => p.id));

  const people = state.people.map((p) => ({
    ...p,
    languages: Array.isArray(p.languages) ? p.languages : [],
    projectStrengths: Array.isArray(p.projectStrengths) ? p.projectStrengths : [],
  }));

  const feedbackNotes = state.feedbackNotes.map((n) => ({
    ...n,
    votedByPersonIds: Array.isArray(n.votedByPersonIds) ? n.votedByPersonIds : [],
  }));

  // Every function/role pair always has a level — merge over the defaults
  // rather than trusting whatever's persisted, so a browser session from
  // before this feature (or before a newly-added function) self-heals
  // instead of treating an unset cell as "hidden".
  const permissions: PermissionMatrix = {};
  for (const fn of APP_FUNCTIONS) {
    permissions[fn.key] = { ...DEFAULT_PERMISSIONS[fn.key], ...(state.permissions?.[fn.key] ?? {}) };
  }

  const existingUserPersonIds = new Set(state.users.map((u) => u.personId));
  const missingUsers: User[] = people
    .filter((p) => !existingUserPersonIds.has(p.id))
    .map((p) => ({ id: `user-repair-${p.id}`, personId: p.id, email: synthesizeEmail(p), role: "user" }));
  const users = [...state.users, ...missingUsers];

  const resourceAllocations = state.resourceAllocations.filter(
    (a) => peopleIds.has(a.personId) && projectIds.has(a.projectId)
  );
  const projectRoleRequirements = state.projectRoleRequirements.filter((r) => projectIds.has(r.projectId));
  const requirementIds = new Set(projectRoleRequirements.map((r) => r.id));
  const projectRoleAssignments = state.projectRoleAssignments.filter(
    (a) => peopleIds.has(a.personId) && projectIds.has(a.projectId) && requirementIds.has(a.roleRequirementId)
  );
  const projectMembers = state.projectMembers.filter(
    (m) => peopleIds.has(m.personId) && projectIds.has(m.projectId)
  );

  const memberKey = (personId: string, projectId: string) => `${personId}|${projectId}`;
  const memberSet = new Set(projectMembers.map((m) => memberKey(m.personId, m.projectId)));
  const missingMembers: ProjectMember[] = [];
  for (const a of resourceAllocations) {
    const key = memberKey(a.personId, a.projectId);
    if (!memberSet.has(key)) {
      missingMembers.push({ personId: a.personId, projectId: a.projectId, roleOnProject: "Team Member" });
      memberSet.add(key);
    }
  }
  for (const a of projectRoleAssignments) {
    const key = memberKey(a.personId, a.projectId);
    if (!memberSet.has(key)) {
      const requirement = projectRoleRequirements.find((r) => r.id === a.roleRequirementId);
      missingMembers.push({ personId: a.personId, projectId: a.projectId, roleOnProject: requirement?.roleName ?? "Team Member" });
      memberSet.add(key);
    }
  }

  const allProjectMembers = [...projectMembers, ...missingMembers];

  // Reverse direction of the sync above: a ProjectMember with no matching
  // ProjectRoleAssignment at all is invisible in that project's Resource &
  // Budget Planning dialog even though they show up on the project's own
  // Team & Resource card — "on the team" and "planned" drift apart, which
  // is exactly the inconsistency this repair exists to close. Backfill a
  // seat (a requirement + an assignment filling it) for any member missing
  // one; day rate is averaged from the project's other seats (a flat
  // fallback if it has none at all), FTE is derived from the member's own
  // ResourceAllocation history when there is any.
  const reqIds = projectRoleRequirements.map((r) => r.id);
  const asgIds = projectRoleAssignments.map((a) => a.id);
  const assignedMemberKeys = new Set(projectRoleAssignments.map((a) => memberKey(a.personId, a.projectId)));
  const backfilledRequirements: ProjectRoleRequirement[] = [];
  const backfilledAssignments: ProjectRoleAssignment[] = [];

  for (const m of allProjectMembers) {
    const key = memberKey(m.personId, m.projectId);
    if (assignedMemberKeys.has(key)) continue;

    const projectReqs = [...projectRoleRequirements, ...backfilledRequirements].filter(
      (r) => r.projectId === m.projectId
    );
    const dayRate =
      projectReqs.length > 0
        ? Math.round(projectReqs.reduce((sum, r) => sum + r.dayRate, 0) / projectReqs.length / 5) * 5
        : 700;

    const reqId = nextId("req-repair", reqIds);
    reqIds.push(reqId);
    const requirement: ProjectRoleRequirement = {
      id: reqId,
      projectId: m.projectId,
      roleName: m.roleOnProject,
      dayRate,
      ftePerWeek: deriveFtePerWeekFromAllocations(resourceAllocations, m.personId, m.projectId),
    };
    backfilledRequirements.push(requirement);

    const asgId = nextId("asg-repair", asgIds);
    asgIds.push(asgId);
    backfilledAssignments.push({ id: asgId, projectId: m.projectId, roleRequirementId: reqId, personId: m.personId, dayRate });

    assignedMemberKeys.add(key);
  }

  return {
    ...state,
    people,
    feedbackNotes,
    permissions,
    users,
    resourceAllocations,
    projectRoleRequirements: [...projectRoleRequirements, ...backfilledRequirements],
    projectRoleAssignments: [...projectRoleAssignments, ...backfilledAssignments],
    projectMembers: allProjectMembers,
  };
}

export function createAppStore() {
  return createStore<AppState>()(
    persist(
      immer((set) => ({
        currentUserId: INITIAL_USERS[0].personId,
        viewAsRole: "admin",

        locations: INITIAL_LOCATIONS,
        industries: INITIAL_INDUSTRIES,
        skills: INITIAL_SKILLS,
        certifications: INITIAL_CERTIFICATIONS,
        interests: INITIAL_INTERESTS,
        roles: INITIAL_ROLES,
        users: INITIAL_USERS,
        permissions: DEFAULT_PERMISSIONS,

        people: INITIAL_PEOPLE,
        personSkills: INITIAL_PERSON_SKILLS,
        personCertifications: INITIAL_PERSON_CERTIFICATIONS,
        clients: INITIAL_CLIENTS,
        projects: INITIAL_PROJECTS,
        projectMembers: INITIAL_PROJECT_MEMBERS,
        projectSkills: INITIAL_PROJECT_SKILLS,
        resourceAllocations: INITIAL_RESOURCE_ALLOCATIONS,
        budgetPlans: INITIAL_BUDGET_PLANS,
        projectRoleRequirements: INITIAL_PROJECT_ROLE_REQUIREMENTS,
        projectRoleAssignments: INITIAL_PROJECT_ROLE_ASSIGNMENTS,
        feedbackNotes: [],

        setViewAsRole: (role) =>
          set((state) => {
            state.viewAsRole = role;
          }),

        setCurrentUser: (personId) =>
          set((state) => {
            state.currentUserId = personId;
          }),

        updatePerson: (personId, patch) =>
          set((state) => {
            const person = state.people.find((p) => p.id === personId);
            if (person) Object.assign(person, patch);
          }),

        setPersonSkillLevel: (personId, skillId, level) =>
          set((state) => {
            const existing = state.personSkills.find(
              (ps) => ps.personId === personId && ps.skillId === skillId
            );
            if (existing) {
              existing.level = level;
            } else {
              state.personSkills.push({ personId, skillId, level });
            }
          }),

        removePersonSkill: (personId, skillId) =>
          set((state) => {
            state.personSkills = state.personSkills.filter(
              (ps) => !(ps.personId === personId && ps.skillId === skillId)
            );
          }),

        addPersonCertification: (entry) =>
          set((state) => {
            state.personCertifications = state.personCertifications.filter(
              (pc) => !(pc.personId === entry.personId && pc.certificationId === entry.certificationId)
            );
            state.personCertifications.push(entry);
          }),

        removePersonCertification: (personId, certificationId) =>
          set((state) => {
            state.personCertifications = state.personCertifications.filter(
              (pc) => !(pc.personId === personId && pc.certificationId === certificationId)
            );
          }),

        createProject: (project, members, skillIds) =>
          set((state) => {
            state.projects.unshift(project);
            state.projectMembers.push(...members);
            for (const skillId of skillIds) {
              state.projectSkills.push({ projectId: project.id, skillId });
            }
          }),

        updateProject: (projectId, patch) =>
          set((state) => {
            const project = state.projects.find((p) => p.id === projectId);
            if (project) Object.assign(project, patch);
          }),

        setProjectTeam: (projectId, members) =>
          set((state) => {
            state.projectMembers = state.projectMembers.filter((m) => m.projectId !== projectId);
            state.projectMembers.push(...members.map((m) => ({ ...m, projectId })));
          }),

        setProjectSkills: (projectId, skillIds) =>
          set((state) => {
            state.projectSkills = state.projectSkills.filter((s) => s.projectId !== projectId);
            state.projectSkills.push(...skillIds.map((skillId) => ({ projectId, skillId })));
          }),

        addProjectMembership: (personId, projectId, roleOnProject) =>
          set((state) => {
            const existing = state.projectMembers.find(
              (m) => m.personId === personId && m.projectId === projectId
            );
            if (existing) {
              existing.roleOnProject = roleOnProject;
            } else {
              state.projectMembers.push({ personId, projectId, roleOnProject });
            }
          }),

        updateProjectMemberContribution: (personId, projectId, contributionDescription) =>
          set((state) => {
            const member = state.projectMembers.find((m) => m.personId === personId && m.projectId === projectId);
            if (member) member.contributionDescription = contributionDescription;
          }),

        removeProjectMembership: (personId, projectId) =>
          set((state) => {
            // ProjectMember is the single source of truth for "is this
            // person on this project" — removing it must also drop any
            // allocation/staffing-plan rows for the same pair, or they'd
            // keep showing this person's utilization on a project they're
            // no longer part of.
            state.projectMembers = state.projectMembers.filter(
              (m) => !(m.personId === personId && m.projectId === projectId)
            );
            state.resourceAllocations = state.resourceAllocations.filter(
              (a) => !(a.personId === personId && a.projectId === projectId)
            );
            state.projectRoleAssignments = state.projectRoleAssignments.filter(
              (a) => !(a.personId === personId && a.projectId === projectId)
            );
          }),

        addClient: (client) =>
          set((state) => {
            state.clients.push(client);
          }),

        updateClient: (clientId, patch) =>
          set((state) => {
            const client = state.clients.find((c) => c.id === clientId);
            if (client) Object.assign(client, patch);
          }),

        removeClient: (clientId) =>
          set((state) => {
            state.clients = state.clients.filter((c) => c.id !== clientId);
          }),

        upsertAllocation: (allocation) =>
          set((state) => {
            if (allocation.id) {
              const existing = state.resourceAllocations.find((a) => a.id === allocation.id);
              if (existing) {
                Object.assign(existing, allocation);
                return;
              }
            }
            const existingForMonth = state.resourceAllocations.find(
              (a) =>
                a.personId === allocation.personId &&
                a.projectId === allocation.projectId &&
                a.month === allocation.month
            );
            if (existingForMonth) {
              existingForMonth.allocationPercent = allocation.allocationPercent;
              return;
            }
            const id = nextId(
              "alloc",
              state.resourceAllocations.map((a) => a.id)
            );
            state.resourceAllocations.push({ ...allocation, id });
          }),

        removeAllocation: (allocationId) =>
          set((state) => {
            state.resourceAllocations = state.resourceAllocations.filter((a) => a.id !== allocationId);
          }),

        assignToProject: ({ personId, projectId, month, allocationPercent, roleOnProject }) =>
          set((state) => {
            const isMember = state.projectMembers.some(
              (m) => m.personId === personId && m.projectId === projectId
            );
            if (!isMember) {
              state.projectMembers.push({ projectId, personId, roleOnProject: roleOnProject ?? "Team Member" });
            }
            const existing = state.resourceAllocations.find(
              (a) => a.personId === personId && a.projectId === projectId && a.month === month
            );
            if (existing) {
              existing.allocationPercent = allocationPercent;
            } else {
              const id = nextId(
                "alloc",
                state.resourceAllocations.map((a) => a.id)
              );
              state.resourceAllocations.push({ id, personId, projectId, month, allocationPercent });
            }
          }),

        importPeople: (newPeople) =>
          set((state) => {
            for (const p of newPeople) {
              const idx = state.people.findIndex((existing) => existing.id === p.id);
              if (idx >= 0) state.people[idx] = p;
              else state.people.push(p);
            }
          }),

        importProjects: (newProjects) =>
          set((state) => {
            for (const p of newProjects) {
              const idx = state.projects.findIndex((existing) => existing.id === p.id);
              if (idx >= 0) state.projects[idx] = p;
              else state.projects.push(p);
            }
          }),

        addSkill: (skill) =>
          set((state) => {
            state.skills.push(skill);
          }),

        removeSkill: (skillId) =>
          set((state) => {
            state.skills = state.skills.filter((s) => s.id !== skillId);
            state.personSkills = state.personSkills.filter((ps) => ps.skillId !== skillId);
            state.projectSkills = state.projectSkills.filter((ps) => ps.skillId !== skillId);
          }),

        addLocation: (location) =>
          set((state) => {
            const id = nextId(
              "loc-custom",
              state.locations.map((l) => l.id)
            );
            state.locations.push({ ...location, id });
          }),

        removeLocation: (locationId) =>
          set((state) => {
            state.locations = state.locations.filter((l) => l.id !== locationId);
          }),

        addCertification: (certification) =>
          set((state) => {
            const id = nextId(
              "cert-custom",
              state.certifications.map((c) => c.id)
            );
            state.certifications.push({ ...certification, id });
          }),

        removeCertification: (certificationId) =>
          set((state) => {
            state.certifications = state.certifications.filter((c) => c.id !== certificationId);
            state.personCertifications = state.personCertifications.filter(
              (pc) => pc.certificationId !== certificationId
            );
          }),

        addInterest: (interest) =>
          set((state) => {
            const id = nextId(
              "int-custom",
              state.interests.map((i) => i.id)
            );
            state.interests.push({ ...interest, id });
          }),

        removeInterest: (interestId) =>
          set((state) => {
            state.interests = state.interests.filter((i) => i.id !== interestId);
            for (const person of state.people) {
              person.interestIds = person.interestIds.filter((id) => id !== interestId);
            }
          }),

        addRole: (role) =>
          set((state) => {
            const id = nextId(
              "role-custom",
              state.roles.map((r) => r.id)
            );
            state.roles.push({ ...role, id });
          }),

        removeRole: (roleId) =>
          set((state) => {
            state.roles = state.roles.filter((r) => r.id !== roleId);
          }),

        addRoleRequirement: ({ projectId, roleName, dayRate }) =>
          set((state) => {
            const id = nextId(
              "req",
              state.projectRoleRequirements.map((r) => r.id)
            );
            state.projectRoleRequirements.push({ id, projectId, roleName, dayRate, ftePerWeek: {} });
          }),

        removeRoleRequirement: (requirementId) =>
          set((state) => {
            state.projectRoleRequirements = state.projectRoleRequirements.filter((r) => r.id !== requirementId);
            const droppedAssignmentIds = new Set(
              state.projectRoleAssignments
                .filter((a) => a.roleRequirementId === requirementId)
                .map((a) => a.id)
            );
            state.projectRoleAssignments = state.projectRoleAssignments.filter(
              (a) => !droppedAssignmentIds.has(a.id)
            );
          }),

        updateRoleRequirementDayRate: (requirementId, dayRate) =>
          set((state) => {
            const req = state.projectRoleRequirements.find((r) => r.id === requirementId);
            if (req) req.dayRate = dayRate;
          }),

        setRoleRequirementWeekFte: (requirementId, week, fte) =>
          set((state) => {
            const req = state.projectRoleRequirements.find((r) => r.id === requirementId);
            if (!req) return;
            if (fte > 0) req.ftePerWeek[week] = fte;
            else delete req.ftePerWeek[week];
          }),

        addRoleAssignment: ({ projectId, roleRequirementId, personId, dayRate }) =>
          set((state) => {
            const id = nextId(
              "asg",
              state.projectRoleAssignments.map((a) => a.id)
            );
            state.projectRoleAssignments.push({ id, projectId, roleRequirementId, personId, dayRate });
            // Keep ProjectMember (the single source of truth for "on this
            // project") in sync — staffing someone via the planning dialog
            // must make them show up in the project's own team list too.
            const isMember = state.projectMembers.some((m) => m.personId === personId && m.projectId === projectId);
            if (!isMember) {
              const requirement = state.projectRoleRequirements.find((r) => r.id === roleRequirementId);
              state.projectMembers.push({ projectId, personId, roleOnProject: requirement?.roleName ?? "Team Member" });
            }
          }),

        removeRoleAssignment: (assignmentId) =>
          set((state) => {
            state.projectRoleAssignments = state.projectRoleAssignments.filter((a) => a.id !== assignmentId);
          }),

        updateRoleAssignmentDayRate: (assignmentId, dayRate) =>
          set((state) => {
            const assignment = state.projectRoleAssignments.find((a) => a.id === assignmentId);
            if (assignment) assignment.dayRate = dayRate;
          }),

        addFeedbackNote: ({ type, text, authorPersonId }) =>
          set((state) => {
            const id = nextId(
              "feedback",
              state.feedbackNotes.map((n) => n.id)
            );
            state.feedbackNotes.unshift({
              id,
              type,
              text,
              authorPersonId,
              createdAt: new Date().toISOString(),
              votedByPersonIds: [],
            });
          }),

        removeFeedbackNote: (noteId) =>
          set((state) => {
            state.feedbackNotes = state.feedbackNotes.filter((n) => n.id !== noteId);
          }),

        toggleFeedbackVote: (noteId, personId) =>
          set((state) => {
            const note = state.feedbackNotes.find((n) => n.id === noteId);
            if (!note) return;
            const idx = note.votedByPersonIds.indexOf(personId);
            if (idx === -1) note.votedByPersonIds.push(personId);
            else note.votedByPersonIds.splice(idx, 1);
          }),

        addUser: ({ personId, email, role }) =>
          set((state) => {
            const id = nextId(
              "user",
              state.users.map((u) => u.id)
            );
            state.users.push({ id, personId, email, role });
          }),

        setPersonRole: (personId, role) =>
          set((state) => {
            const existing = state.users.find((u) => u.personId === personId);
            if (existing) {
              existing.role = role;
              return;
            }
            const person = state.people.find((p) => p.id === personId);
            if (!person) return;
            const id = nextId(
              "user",
              state.users.map((u) => u.id)
            );
            state.users.push({ id, personId, email: synthesizeEmail(person), role });
          }),

        setPermission: (functionKey, role, level) =>
          set((state) => {
            if (!state.permissions[functionKey]) {
              state.permissions[functionKey] = { user: "hidden", management: "hidden", admin: "hidden" };
            }
            state.permissions[functionKey][role] = level;
          }),
      })),
      {
        name: "nexus-pm-tool-store",
        version: 1,
        storage: createJSONStorage(() => localStorage),
        merge: (persistedState, currentState) =>
          repairState({ ...currentState, ...(persistedState as Partial<AppState>) }),
        partialize: (state) => ({
          currentUserId: state.currentUserId,
          viewAsRole: state.viewAsRole,
          locations: state.locations,
          skills: state.skills,
          certifications: state.certifications,
          interests: state.interests,
          roles: state.roles,
          users: state.users,
          permissions: state.permissions,
          people: state.people,
          personSkills: state.personSkills,
          personCertifications: state.personCertifications,
          clients: state.clients,
          projects: state.projects,
          projectMembers: state.projectMembers,
          projectSkills: state.projectSkills,
          resourceAllocations: state.resourceAllocations,
          budgetPlans: state.budgetPlans,
          projectRoleRequirements: state.projectRoleRequirements,
          projectRoleAssignments: state.projectRoleAssignments,
          feedbackNotes: state.feedbackNotes,
        }),
      }
    )
  );
}

export type AppStore = ReturnType<typeof createAppStore>;
