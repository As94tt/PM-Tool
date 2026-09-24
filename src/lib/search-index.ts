import type {
  Person,
  Project,
  Skill,
  Industry,
  Certification,
  PersonSkill,
  ProjectSkill,
  Client,
} from "@/lib/types";
import { fullName, getProjectsForClient } from "@/lib/data/queries";

export type SearchResultType = "person" | "project" | "skill" | "client" | "industry" | "certification";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchSource {
  people: Person[];
  projects: Project[];
  skills: Skill[];
  industries: Industry[];
  certifications: Certification[];
  personSkills: PersonSkill[];
  projectSkills: ProjectSkill[];
  clients: Client[];
  locations: { id: string; city: string }[];
}

export function buildSearchIndex(src: SearchSource): SearchResult[] {
  const results: SearchResult[] = [];

  for (const p of src.people) {
    const location = src.locations.find((l) => l.id === p.locationId);
    results.push({
      id: p.id,
      type: "person",
      title: fullName(p),
      subtitle: `${p.jobTitle}${location ? ` · ${location.city}` : ""}`,
      href: `/people/${p.id}`,
    });
  }

  for (const proj of src.projects) {
    results.push({
      id: proj.id,
      type: "project",
      title: proj.name,
      subtitle: `${proj.clientName} · ${proj.status}`,
      href: `/projects/${proj.id}`,
    });
  }

  for (const skill of src.skills) {
    const peopleCount = src.personSkills.filter((ps) => ps.skillId === skill.id).length;
    const projectCount = src.projectSkills.filter((ps) => ps.skillId === skill.id).length;
    results.push({
      id: skill.id,
      type: "skill",
      title: skill.name,
      subtitle: `${peopleCount} people · ${projectCount} projects · ${skill.category}`,
      href: `/skill-matrix?skill=${skill.id}`,
    });
  }

  for (const client of src.clients) {
    const count = getProjectsForClient(src.projects, client.name).length;
    results.push({
      id: client.id,
      type: "client",
      title: client.name,
      subtitle: `${count} project${count === 1 ? "" : "s"}${client.contactName ? ` · ${client.contactName}` : ""}`,
      href: `/customers/${client.id}`,
    });
  }

  for (const industry of src.industries) {
    const count = src.projects.filter((p) => p.industryId === industry.id).length;
    results.push({
      id: industry.id,
      type: "industry",
      title: industry.name,
      subtitle: `${count} project${count === 1 ? "" : "s"} · Industry`,
      href: `/projects?industry=${industry.id}`,
    });
  }

  for (const cert of src.certifications) {
    results.push({
      id: cert.id,
      type: "certification",
      title: cert.name,
      subtitle: cert.issuer,
      href: `/people?certification=${cert.id}`,
    });
  }

  return results;
}

export function filterSearchIndex(index: SearchResult[], query: string, perGroup = 5): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = index.filter(
    (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
  );
  const byType = new Map<SearchResultType, SearchResult[]>();
  for (const m of matches) {
    const list = byType.get(m.type) ?? [];
    if (list.length < perGroup) list.push(m);
    byType.set(m.type, list);
  }
  return Array.from(byType.values()).flat();
}
