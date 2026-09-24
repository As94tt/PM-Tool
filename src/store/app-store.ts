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
  ProjectRoleRequirement,
  ProjectRoleAssignment,
} from "@/lib/types";
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

        removeProjectMembership: (personId, projectId) =>
          set((state) => {
            state.projectMembers = state.projectMembers.filter(
              (m) => !(m.personId === personId && m.projectId === projectId)
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
      })),
      {
        name: "nexus-pm-tool-store",
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          currentUserId: state.currentUserId,
          viewAsRole: state.viewAsRole,
          locations: state.locations,
          skills: state.skills,
          certifications: state.certifications,
          interests: state.interests,
          roles: state.roles,
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
        }),
      }
    )
  );
}

export type AppStore = ReturnType<typeof createAppStore>;
