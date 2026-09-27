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
import { startOfWeek, weekKey, addWeeks, getHorizonWeeks, weekToMonthKey } from "@/lib/data/week-planning";
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
  /** Admin's "delete this user" action — removes their login/role record
   * only. The Person itself (profile, project history, skills) is untouched;
   * this is closer to disabling an account than deleting a colleague. */
  removeUser: (personId: string) => void;
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

/**
 * One-time cleanup (see the `migrate` option below, version 2 -> 3): backfills
 * a User record (role "user") for any Person that doesn't have one at all —
 * legacy demo data from before every person-creation path explicitly created
 * one (CSV import, the "New person" form — round 15).
 *
 * Deliberately NOT part of `repairState` below, which runs on every load:
 * now that Admins can delete a person's User record from the Users tab (see
 * `removeUser`), a repeatedly-reapplied version of this backfill would
 * silently recreate the very account an admin just deleted, on the next
 * reload — the same class of bug the staffing-seat backfill above had to be
 * split out of `repairState` to avoid.
 */
function backfillMissingUsers(state: AppState): AppState {
  const people = state.people ?? [];
  const users = state.users ?? [];
  const existingUserPersonIds = new Set(users.map((u) => u.personId));
  const missingUsers: User[] = people
    .filter((p) => !existingUserPersonIds.has(p.id))
    .map((p) => ({ id: `user-repair-${p.id}`, personId: p.id, email: synthesizeEmail(p), role: "user" }));
  return { ...state, users: [...users, ...missingUsers] };
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
 * Recomputes a person's monthly ResourceAllocation rows on a project from
 * their current ProjectRoleAssignments there (weekly FTE -> monthly %,
 * averaged across that month's assigned weeks). The weekly staffing plan
 * (Resource & Budget Planning dialog) is the newer, richer system, but
 * every *other* availability view in the app — Dashboard capacity, the
 * People search availability filter, a person's own availability badge,
 * the Resource Planning matrix/bench, even a project's own mini
 * allocation chart — still reads the older monthly ResourceAllocation
 * rows. Without this, staffing someone purely through the Planning dialog
 * left them looking 0%-allocated / "on the bench" everywhere else, right
 * next to the plan and cost figures on that same project that *did*
 * reflect it. Called from every action that changes an assignment's
 * existence or its requirement's ftePerWeek. Must run inside a `set()`
 * callback (mutates the Immer draft directly, like its callers).
 */
function syncMonthlyAllocations(state: AppState, personId: string, projectId: string) {
  const personAssignments = state.projectRoleAssignments.filter(
    (a) => a.personId === personId && a.projectId === projectId
  );
  const monthlyFte = new Map<string, number[]>();
  for (const asg of personAssignments) {
    const req = state.projectRoleRequirements.find((r) => r.id === asg.roleRequirementId);
    if (!req) continue;
    for (const [week, fte] of Object.entries(req.ftePerWeek)) {
      if (!fte) continue;
      const month = weekToMonthKey(week);
      const list = monthlyFte.get(month) ?? [];
      list.push(fte);
      monthlyFte.set(month, list);
    }
  }

  state.resourceAllocations = state.resourceAllocations.filter(
    (a) => !(a.personId === personId && a.projectId === projectId)
  );
  for (const [month, ftes] of monthlyFte) {
    const avgFte = ftes.reduce((sum, v) => sum + v, 0) / ftes.length;
    const id = nextId(
      "alloc-sync",
      state.resourceAllocations.map((a) => a.id)
    );
    state.resourceAllocations.push({
      id,
      personId,
      projectId,
      month,
      allocationPercent: Math.round(Math.min(100, avgFte * 100)),
    });
  }
}

/**
 * One-time cleanup (see the `migrate` option below, version 1 -> 2): backfills
 * a staffing-plan seat (a ProjectRoleRequirement + ProjectRoleAssignment) for
 * any ProjectMember that has neither, which used to happen for any project
 * whose demo data predated the staffing-plan feature (or, before the
 * generator fix, for completed projects specifically — see
 * generate-data.mjs) — those members showed up on a project's own Team &
 * Resource card but were invisible in its Resource & Budget Planning dialog.
 *
 * Deliberately NOT part of `repairState` below, which runs on every load:
 * the Planning dialog's "Unassign" button removes only the assignment,
 * intentionally leaving someone on the team with no current seat — a
 * repeatedly-reapplied version of this backfill would silently re-staff
 * them right back on the next reload. Running it once, gated by the
 * persisted store's version, fixes the historical drift without fighting
 * that deliberate action afterwards.
 */
function backfillMissingStaffingSeats(state: AppState): AppState {
  const resourceAllocations = state.resourceAllocations ?? [];
  const projectRoleRequirements = state.projectRoleRequirements ?? [];
  const projectRoleAssignments = state.projectRoleAssignments ?? [];
  const projectMembers = state.projectMembers ?? [];

  const memberKey = (personId: string, projectId: string) => `${personId}|${projectId}`;
  const reqIds = projectRoleRequirements.map((r) => r.id);
  const asgIds = projectRoleAssignments.map((a) => a.id);
  const assignedMemberKeys = new Set(projectRoleAssignments.map((a) => memberKey(a.personId, a.projectId)));
  const backfilledRequirements: ProjectRoleRequirement[] = [];
  const backfilledAssignments: ProjectRoleAssignment[] = [];

  for (const m of projectMembers) {
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
    backfilledRequirements.push({
      id: reqId,
      projectId: m.projectId,
      roleName: m.roleOnProject,
      dayRate,
      ftePerWeek: deriveFtePerWeekFromAllocations(resourceAllocations, m.personId, m.projectId),
    });

    const asgId = nextId("asg-repair", asgIds);
    asgIds.push(asgId);
    backfilledAssignments.push({ id: asgId, projectId: m.projectId, roleRequirementId: reqId, personId: m.personId, dayRate });

    assignedMemberKeys.add(key);
  }

  return {
    ...state,
    projectRoleRequirements: [...projectRoleRequirements, ...backfilledRequirements],
    projectRoleAssignments: [...projectRoleAssignments, ...backfilledAssignments],
  };
}

/**
 * Runs on every rehydration (page load) to keep the persisted state
 * internally consistent, self-healing classes of drift that can build up
 * in a browser's localStorage over time as the app evolves:
 *  1. A person saved before a field existed (e.g. `languages`,
 *     `projectStrengths`) won't have it — code that assumes it's always an
 *     array (like the PDF export) would otherwise crash.
 *  2. Rows that reference a person/project that no longer exists (e.g.
 *     after a demo-data regeneration), or an allocation/staffing-plan
 *     entry for a person+project pair with no matching ProjectMember —
 *     ProjectMember is meant to be the single source of truth for "is this
 *     person on this project," so anything implying membership should
 *     always have a matching row there.
 * Deliberately does NOT backfill a missing staffing-plan seat for an
 * existing ProjectMember — that's a one-time migration (see
 * `backfillMissingStaffingSeats` above), not an ongoing invariant, since
 * "on the team with no current seat" is a legitimate, reachable state
 * (the Planning dialog's "Unassign" button produces exactly that).
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

  // Prunes a User record whose person no longer exists (a dangling
  // reference, same as the other cleanups below) — but does NOT backfill a
  // missing one, which is a one-time migration instead (see
  // backfillMissingUsers) so a deliberately deleted account stays deleted.
  const users = state.users.filter((u) => peopleIds.has(u.personId));

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

  return {
    ...state,
    people,
    feedbackNotes,
    permissions,
    users,
    resourceAllocations,
    projectRoleRequirements,
    projectRoleAssignments,
    projectMembers: [...projectMembers, ...missingMembers],
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
            const keptPersonIds = new Set(members.map((m) => m.personId));
            const droppedPersonIds = state.projectMembers
              .filter((m) => m.projectId === projectId && !keptPersonIds.has(m.personId))
              .map((m) => m.personId);

            state.projectMembers = state.projectMembers.filter((m) => m.projectId !== projectId);
            state.projectMembers.push(...members.map((m) => ({ ...m, projectId })));

            // Same cascade as removeProjectMembership — editing a project's
            // team here is how a member actually gets dropped, so leaving
            // their allocation/staffing-plan rows behind would keep
            // counting them toward this project's utilization and cost
            // after they're no longer on it (and resurrect them as a
            // member on the next reload, since those rows imply membership).
            if (droppedPersonIds.length > 0) {
              const droppedSet = new Set(droppedPersonIds);
              state.resourceAllocations = state.resourceAllocations.filter(
                (a) => !(a.projectId === projectId && droppedSet.has(a.personId))
              );
              state.projectRoleAssignments = state.projectRoleAssignments.filter(
                (a) => !(a.projectId === projectId && droppedSet.has(a.personId))
              );
            }
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
            const droppedAssignments = state.projectRoleAssignments.filter(
              (a) => a.roleRequirementId === requirementId
            );
            state.projectRoleRequirements = state.projectRoleRequirements.filter((r) => r.id !== requirementId);
            const droppedAssignmentIds = new Set(droppedAssignments.map((a) => a.id));
            state.projectRoleAssignments = state.projectRoleAssignments.filter(
              (a) => !droppedAssignmentIds.has(a.id)
            );
            const affected = new Map(droppedAssignments.map((a) => [a.personId, a.projectId]));
            for (const [personId, projectId] of affected) syncMonthlyAllocations(state, personId, projectId);
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
            const affectedAssignments = state.projectRoleAssignments.filter((a) => a.roleRequirementId === requirementId);
            for (const a of affectedAssignments) syncMonthlyAllocations(state, a.personId, a.projectId);
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
            syncMonthlyAllocations(state, personId, projectId);
          }),

        removeRoleAssignment: (assignmentId) =>
          set((state) => {
            const assignment = state.projectRoleAssignments.find((a) => a.id === assignmentId);
            state.projectRoleAssignments = state.projectRoleAssignments.filter((a) => a.id !== assignmentId);
            if (assignment) syncMonthlyAllocations(state, assignment.personId, assignment.projectId);
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

        removeUser: (personId) =>
          set((state) => {
            state.users = state.users.filter((u) => u.personId !== personId);
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
        version: 3,
        storage: createJSONStorage(() => localStorage),
        // Runs once for any store persisted at an older version, before
        // `merge` below — the right place for a one-time data cleanup that
        // must NOT reapply itself on every load (see backfillMissingStaffingSeats
        // and backfillMissingUsers). Each migration only applies if the
        // persisted version is old enough to need it, so a version-3 store
        // (or later) skips both and a version-0/1 store gets both in order.
        migrate: (persistedState, version) => {
          let state = persistedState as AppState;
          if (version < 2) state = backfillMissingStaffingSeats(state);
          if (version < 3) state = backfillMissingUsers(state);
          return state;
        },
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
