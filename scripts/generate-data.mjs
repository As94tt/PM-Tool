// Generates realistic, internally-consistent demo data for the PoC.
// Run with: node scripts/generate-data.mjs
// Output: src/lib/data/generated/*.json (checked into the repo, imported at build time).

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../src/lib/data/generated");
mkdirSync(OUT_DIR, { recursive: true });

// ---------- seeded RNG (mulberry32) for reproducible demo data ----------
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1337);
const rnd = () => rand();
const rndInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[rndInt(0, arr.length - 1)];
const chance = (p) => rnd() < p;
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rndInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sampleUnique(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}
function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------- month helpers ----------
const TODAY = new Date();
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isoDate(d) {
  // local-calendar-date formatting; avoids toISOString()'s UTC shift for local midnight dates
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}
function weekKey(d) {
  return isoDate(startOfWeek(d));
}
function addWeeks(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7);
}

const HORIZON_START = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
const HORIZON_MONTHS = Array.from({ length: 12 }, (_, i) =>
  monthKey(addMonths(HORIZON_START, i))
);

// ================= static reference data =================

const locations = [
  { id: "loc-dus", city: "Düsseldorf", country: "Germany", region: "EMEA" },
  { id: "loc-ber", city: "Berlin", country: "Germany", region: "EMEA" },
  { id: "loc-stu", city: "Stuttgart", country: "Germany", region: "EMEA" },
  { id: "loc-muc", city: "Munich", country: "Germany", region: "EMEA" },
  { id: "loc-ham", city: "Hamburg", country: "Germany", region: "EMEA" },
  { id: "loc-col", city: "Cologne", country: "Germany", region: "EMEA" },
  { id: "loc-por", city: "Porto", country: "Portugal", region: "EMEA" },
  { id: "loc-lis", city: "Lisbon", country: "Portugal", region: "EMEA" },
];

const industries = [
  { id: "ind-automotive", name: "Automotive" },
  { id: "ind-telco", name: "Telecommunications" },
  { id: "ind-banking", name: "Banking & Financial Services" },
  { id: "ind-insurance", name: "Insurance" },
  { id: "ind-retail", name: "Retail & E-Commerce" },
  { id: "ind-healthcare", name: "Healthcare & Life Sciences" },
  { id: "ind-manufacturing", name: "Manufacturing" },
  { id: "ind-energy", name: "Energy & Utilities" },
  { id: "ind-public", name: "Public Sector" },
  { id: "ind-logistics", name: "Logistics & Transportation" },
];

/** category -> [skill names] */
const SKILL_POOL = {
  Cloud: ["AWS", "Azure", "Google Cloud Platform", "Kubernetes", "Terraform", "Docker", "Cloud Security"],
  "Software Development": ["Java", "Python", "TypeScript", "React", "Node.js", ".NET / C#", "Go", "REST API Design", "Microservices"],
  "Data & AI": ["Machine Learning", "Data Engineering", "Data Science", "Power BI", "SQL", "Apache Spark", "Generative AI / LLMs"],
  Telco: ["5G", "Private Networks", "Network Function Virtualization", "OSS/BSS"],
  Infrastructure: ["Linux Administration", "Network Engineering", "VMware", "Ansible", "CI/CD", "Site Reliability Engineering"],
  Cybersecurity: ["Penetration Testing", "Identity & Access Management", "SIEM", "Security Architecture", "GRC & Compliance"],
  "Project Management": ["Scrum", "Kanban", "PRINCE2", "Stakeholder Management"],
  Business: ["Business Analysis", "Requirements Engineering", "Change Management", "Financial Modeling"],
  Sales: ["Salesforce", "Solution Selling", "Account Management", "Bid Management"],
  "Design / UX": ["UX Research", "UI Design", "Figma", "Design Systems"],
};

const skills = [];
for (const [category, names] of Object.entries(SKILL_POOL)) {
  for (const name of names) {
    skills.push({ id: `skill-${slugify(name)}`, category, name });
  }
}
const skillsByCategory = (cat) => skills.filter((s) => s.category === cat);

const certifications = [
  { id: "cert-aws-saa", name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", category: "Cloud" },
  { id: "cert-aws-devops", name: "AWS Certified DevOps Engineer", issuer: "Amazon Web Services", category: "Cloud" },
  { id: "cert-az-arch", name: "Microsoft Certified: Azure Solutions Architect Expert", issuer: "Microsoft", category: "Cloud" },
  { id: "cert-gcp-arch", name: "Google Professional Cloud Architect", issuer: "Google Cloud", category: "Cloud" },
  { id: "cert-cka", name: "Certified Kubernetes Administrator", issuer: "CNCF", category: "Cloud" },
  { id: "cert-pmp", name: "Project Management Professional (PMP)", issuer: "PMI", category: "Project Management" },
  { id: "cert-psm", name: "Professional Scrum Master I", issuer: "Scrum.org", category: "Project Management" },
  { id: "cert-prince2", name: "PRINCE2 Practitioner", issuer: "AXELOS", category: "Project Management" },
  { id: "cert-cissp", name: "CISSP", issuer: "(ISC)²", category: "Cybersecurity" },
  { id: "cert-cism", name: "CISM", issuer: "ISACA", category: "Cybersecurity" },
  { id: "cert-itil", name: "ITIL 4 Foundation", issuer: "AXELOS", category: "Infrastructure" },
  { id: "cert-togaf", name: "TOGAF 9 Certified", issuer: "The Open Group", category: "Business" },
  { id: "cert-sfdc-admin", name: "Salesforce Certified Administrator", issuer: "Salesforce", category: "Sales" },
  { id: "cert-databricks", name: "Databricks Certified Data Engineer", issuer: "Databricks", category: "Data & AI" },
  { id: "cert-ccnp", name: "CCNP Enterprise", issuer: "Cisco", category: "Infrastructure" },
  { id: "cert-comptia-sec", name: "CompTIA Security+", issuer: "CompTIA", category: "Cybersecurity" },
  { id: "cert-iso27001", name: "ISO 27001 Lead Auditor", issuer: "PECB", category: "Cybersecurity" },
];

const interests = [
  "Mountain biking", "Photography", "Cooking", "Running & marathons", "Chess",
  "Playing guitar", "Padel", "Yoga", "Sci-fi novels", "Board games", "Travel",
  "Home-brewing", "Ceramics", "Snowboarding", "Volunteering", "Amateur astronomy",
  "Home automation & DIY electronics", "Sailing", "Rock climbing", "Podcasting",
  "Urban gardening", "Vinyl records", "Trail running", "Woodworking",
].map((name) => ({ id: `int-${slugify(name)}`, name }));

// ---------- "tracks" link a person's title/seniority to relevant skill categories ----------
const TRACKS = {
  cloud: {
    categories: ["Cloud", "Infrastructure"],
    titles: ["Cloud Engineer", "Cloud Solutions Architect", "Senior Cloud Architect", "Platform Engineer", "DevOps Engineer"],
    certs: ["cert-aws-saa", "cert-aws-devops", "cert-az-arch", "cert-gcp-arch", "cert-cka"],
    strengths: ["Cloud migration", "Cost optimization", "Infrastructure automation", "Landing zone design"],
  },
  dev: {
    categories: ["Software Development", "Cloud"],
    titles: ["Software Engineer", "Senior Software Engineer", "Backend Developer", "Frontend Developer", "Full-Stack Engineer", "Engineering Lead"],
    certs: ["cert-aws-saa", "cert-cka"],
    strengths: ["Clean architecture", "Agile delivery", "Code quality & testing", "API design"],
  },
  data: {
    categories: ["Data & AI", "Software Development"],
    titles: ["Data Engineer", "Data Scientist", "Machine Learning Engineer", "Analytics Consultant", "BI Consultant"],
    certs: ["cert-databricks", "cert-aws-saa"],
    strengths: ["Data storytelling", "ML productionization", "Pipeline reliability", "Stakeholder reporting"],
  },
  telco: {
    categories: ["Telco", "Infrastructure"],
    titles: ["Telco Network Engineer", "5G Solutions Consultant", "Network Architect", "OSS/BSS Consultant"],
    certs: ["cert-ccnp", "cert-itil"],
    strengths: ["Network design", "Vendor management", "Rollout planning", "Field troubleshooting"],
  },
  infra: {
    categories: ["Infrastructure", "Cloud"],
    titles: ["Infrastructure Engineer", "Systems Administrator", "Site Reliability Engineer", "Network Engineer"],
    certs: ["cert-ccnp", "cert-itil", "cert-cka"],
    strengths: ["Reliability engineering", "Incident response", "Capacity planning", "Automation scripting"],
  },
  security: {
    categories: ["Cybersecurity", "Infrastructure"],
    titles: ["Security Consultant", "Security Architect", "Penetration Tester", "GRC Consultant"],
    certs: ["cert-cissp", "cert-cism", "cert-comptia-sec", "cert-iso27001"],
    strengths: ["Risk assessment", "Compliance alignment", "Security awareness training", "Threat modeling"],
  },
  pm: {
    categories: ["Project Management", "Business"],
    titles: ["Project Manager", "Senior Project Manager", "Program Manager", "Scrum Master", "Delivery Lead"],
    certs: ["cert-pmp", "cert-psm", "cert-prince2"],
    strengths: ["Stakeholder management", "Risk & issue management", "Cross-team coordination", "Delivery governance"],
  },
  business: {
    categories: ["Business", "Project Management"],
    titles: ["Business Analyst", "Senior Business Analyst", "Management Consultant", "Change Manager"],
    certs: ["cert-togaf", "cert-prince2"],
    strengths: ["Requirements elicitation", "Process redesign", "Change management", "Workshop facilitation"],
  },
  sales: {
    categories: ["Sales", "Business"],
    titles: ["Account Manager", "Sales Director", "Business Development Manager", "Bid Manager"],
    certs: ["cert-sfdc-admin"],
    strengths: ["Client relationship building", "Solution selling", "Contract negotiation", "Bid management"],
  },
  design: {
    categories: ["Design / UX", "Software Development"],
    titles: ["UX Designer", "UI Designer", "Senior Product Designer", "Design Lead"],
    certs: [],
    strengths: ["User research", "Design systems", "Rapid prototyping", "Accessibility"],
  },
};

const COUNTRY_LANGUAGE = {
  Germany: "German",
  Portugal: "Portuguese",
};
const EXTRA_LANGUAGES = ["French", "Spanish", "Italian", "Mandarin"];
const TRACK_KEYS = Object.keys(TRACKS);

// each track maps to one of the four company departments
const TRACK_DEPARTMENT = {
  cloud: "IT Solutions",
  infra: "IT Solutions",
  security: "IT Solutions",
  business: "IT Solutions",
  sales: "IT Solutions",
  dev: "Development",
  design: "Development",
  pm: "Development",
  data: "Data",
  telco: "5G",
};

const FIRST_NAMES = [
  "Anna", "Lukas", "Mia", "Felix", "Laura", "Jonas", "Sophie", "Paul", "Lena", "Tim",
  "Julia", "Max", "Hannah", "David", "Nina", "Tobias", "Clara", "Simon", "Sarah", "Jan",
  "Elena", "Daniel", "Marie", "Alexander", "Katharina", "Philipp", "Franziska", "Moritz",
  "Isabel", "Sebastian", "Ioana", "Andrei", "Mihai", "Cristina", "Ana", "Bogdan",
  "Priya", "Arjun", "Fatima", "Youssef", "Chloe", "Thomas", "Emma", "Noah", "Lea",
  "Mateusz", "Katarzyna", "Rui", "Beatriz", "Joana",
];
const LAST_NAMES = [
  "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
  "Hoffmann", "Schulz", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Zimmermann",
  "Krüger", "Hartmann", "Lange", "Werner", "Popescu", "Ionescu", "Constantin", "Dumitru",
  "Stanescu", "Radu", "Kowalski", "Nowak", "Wojcik", "Silva", "Costa", "Ferreira",
  "Santos", "Mendes", "Ahmed", "Khan", "Sharma", "Patel", "Dubois", "Laurent",
  "Novak", "Horvat", "Andersson", "Berg", "Larsen", "Jansen", "de Vries", "Rossi",
  "Bianchi", "Conti",
];

// Avatar photos (pravatar.cc) split by presented gender pool to avoid mismatched pairs;
// purely cosmetic variety for demo purposes, not linked to any assumption elsewhere.
const AVATAR_IDS = Array.from({ length: 70 }, (_, i) => i + 1);
const shuffledAvatars = shuffle(AVATAR_IDS);

const BIO_OPENERS = [
  (fn, title, city) => `${fn} works as a ${title} out of the ${city} office`,
  (fn, title, city) => `Based in ${city}, ${fn} is a ${title} on the delivery team`,
  (fn, title, city) => `${fn} is a ${title}, based in ${city}`,
];
const BIO_MIDDLES = [
  (years, domain) => `with ${years} years of experience across ${domain} engagements`,
  (years, domain) => `bringing ${years} years of hands-on work in ${domain} projects`,
  (years, domain) => `with a ${years}-year track record delivering ${domain} initiatives`,
];
const BIO_CLOSERS = [
  (skill) => `Recently focused on ${skill} work for enterprise clients.`,
  (skill) => `Currently deepening expertise in ${skill}.`,
  (skill) => `Enjoys mentoring on ${skill} topics whenever possible.`,
];
const WHY_TEMPLATES = [
  (fn, s1, s2, skill) =>
    `${fn} pairs strong ${s1.toLowerCase()} with deep technical command of ${skill}, and is just as comfortable in the detail as ${s2.toLowerCase()}.`,
  (fn, s1, s2, skill) =>
    `On the technical side, ${fn} brings hands-on expertise in ${skill}; on the personal side, colleagues consistently point to ${s1.toLowerCase()} and ${s2.toLowerCase()}.`,
  (fn, s1, s2, skill) =>
    `${fn} combines solid ${skill} expertise with a track record of ${s1.toLowerCase()}, rounded out by a reputation for ${s2.toLowerCase()}.`,
];

// ================= people =================

const usedNamePairs = new Set();
const people = [];
const users = [];
const personSkills = [];
const personCertifications = [];

const PERSON_COUNT = 10;
for (let i = 0; i < PERSON_COUNT; i++) {
  let firstName, lastName, key;
  do {
    firstName = pick(FIRST_NAMES);
    lastName = pick(LAST_NAMES);
    key = `${firstName}-${lastName}`;
  } while (usedNamePairs.has(key));
  usedNamePairs.add(key);

  const trackKey = TRACK_KEYS[i % TRACK_KEYS.length];
  const track = TRACKS[trackKey];
  const secondaryTrackKey = pick(TRACK_KEYS.filter((k) => k !== trackKey));
  const secondaryTrack = TRACKS[secondaryTrackKey];

  const seniorityRoll = rnd();
  const seniority = seniorityRoll < 0.28 ? "junior" : seniorityRoll < 0.75 ? "mid" : "senior";
  const years = seniority === "junior" ? rndInt(1, 3) : seniority === "mid" ? rndInt(4, 8) : rndInt(9, 18);

  let jobTitle = pick(track.titles);
  if (seniority === "senior" && !jobTitle.toLowerCase().includes("senior") && !jobTitle.toLowerCase().includes("lead") && !jobTitle.toLowerCase().includes("director")) {
    jobTitle = `Senior ${jobTitle}`;
  }

  const location = pick(locations);
  const id = `person-${String(i + 1).padStart(3, "0")}`;

  // skills: 4-8 from primary track categories, 1-3 from secondary track, level correlated with seniority
  const levelForSeniority = () => {
    const base = seniority === "junior" ? [1, 2, 3] : seniority === "mid" ? [2, 3, 3, 4] : [3, 4, 4, 5];
    return pick(base);
  };
  const primaryPool = track.categories.flatMap(skillsByCategory);
  const secondaryPool = secondaryTrack.categories.flatMap(skillsByCategory);
  const chosenPrimary = sampleUnique(primaryPool, rndInt(4, Math.min(8, primaryPool.length)));
  const chosenSecondary = sampleUnique(
    secondaryPool.filter((s) => !chosenPrimary.some((c) => c.id === s.id)),
    rndInt(1, 3)
  );
  const personSkillList = [...chosenPrimary.map((s) => ({ skill: s, boost: 1 })), ...chosenSecondary.map((s) => ({ skill: s, boost: 0 }))];
  for (const { skill, boost } of personSkillList) {
    let level = levelForSeniority() + boost;
    level = Math.max(1, Math.min(5, level));
    personSkills.push({ personId: id, skillId: skill.id, level });
  }

  // certifications: more likely with seniority
  const certProb = seniority === "junior" ? 0.15 : seniority === "mid" ? 0.45 : 0.7;
  const certPool = [...track.certs, ...secondaryTrack.certs];
  const certCount = chance(certProb) ? rndInt(1, Math.min(3, certPool.length || 1)) : 0;
  const chosenCerts = sampleUnique(certPool, certCount);
  for (const certId of chosenCerts) {
    const issued = addMonths(TODAY, -rndInt(2, years * 12));
    const hasExpiry = chance(0.6);
    personCertifications.push({
      personId: id,
      certificationId: certId,
      expiryDate: hasExpiry ? isoDate(addMonths(issued, 36)) : undefined,
    });
  }

  const interestIds = sampleUnique(interests, rndInt(2, 4)).map((i) => i.id);
  const industryExperienceIds = sampleUnique(industries, rndInt(1, 3)).map((i) => i.id);

  // languages: native tongue from the office's country (English if that IS
  // the local language), business-fluent English everywhere else, and
  // sometimes a third language for variety
  const localLanguage = COUNTRY_LANGUAGE[location.country] ?? "English";
  const languages = [{ name: localLanguage, proficiency: "Native" }];
  if (localLanguage !== "English") {
    languages.push({ name: "English", proficiency: chance(0.6) ? "Fluent" : "Professional" });
  }
  if (chance(0.35)) {
    const extra = pick(EXTRA_LANGUAGES.filter((l) => l !== localLanguage));
    languages.push({ name: extra, proficiency: chance(0.5) ? "Conversational" : "Basic" });
  }

  const strengthPool = [...track.strengths, ...secondaryTrack.strengths];
  const projectStrengths = sampleUnique(strengthPool, rndInt(2, 3));

  const domainLabel = pick(industries).name.toLowerCase();
  const topSkillName = (chosenPrimary[0] ?? skills[0]).name;
  const bio = `${pick(BIO_OPENERS)(firstName, jobTitle, location.city)}, ${pick(BIO_MIDDLES)(years, domainLabel)}. ${pick(BIO_CLOSERS)(topSkillName)}`;
  const whyThisPerson = pick(WHY_TEMPLATES)(firstName, projectStrengths[0], projectStrengths[1] ?? projectStrengths[0], topSkillName);

  const joinedDate = isoDate(addMonths(TODAY, -rndInt(2, Math.max(3, years * 12 - 6))));

  people.push({
    id,
    firstName,
    lastName,
    avatarUrl: `https://i.pravatar.cc/300?img=${shuffledAvatars[i % shuffledAvatars.length]}`,
    jobTitle,
    department: TRACK_DEPARTMENT[trackKey],
    locationId: location.id,
    bio,
    interestIds,
    industryExperienceIds,
    joinedDate,
    languages,
    projectStrengths,
    whyThisPerson,
    _track: trackKey,
    _seniority: seniority,
  });

  const appRole = i === 0 ? "admin" : i < 6 ? "management" : "user";
  users.push({
    id: `user-${id}`,
    personId: id,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@nexuscorp.example`,
    role: appRole,
  });
}

// ================= projects =================

// A small, easy-to-verify-by-eye dataset: 5 projects across just 3 clients
// (two clients get a second engagement each), spanning completed/active/planned.
const PROJECT_DEFS = [
  { name: "Orion Cloud Migration", client: "Meridian Automotive Group", industryId: "ind-automotive", type: "Cloud Migration", track: "cloud",
    desc: "Migrated a fleet-telemetry platform from on-prem data centers to a multi-region AWS landing zone.",
    outcomes: ["Cut infrastructure cost by 34% within two quarters", "Reduced deployment lead time from days to hours", "Zero-downtime cutover for 2.1M connected vehicles"] },
  { name: "Meridian Connected Diagnostics", client: "Meridian Automotive Group", industryId: "ind-automotive", type: "Implementation", track: "cloud",
    desc: "Implemented a predictive-maintenance data pipeline consuming vehicle sensor telemetry in near real time.",
    outcomes: ["Reduced unplanned downtime for fleet customers by 19%", "Processed 40TB of telemetry data per day", "Delivered self-service diagnostics dashboard"] },
  { name: "Union Health Records Interop", client: "Union Health Network", industryId: "ind-healthcare", type: "Systems Integration", track: "business",
    desc: "Integrated regional patient-record systems onto a standards-based interoperability layer.",
    outcomes: ["Connected 12 hospital systems on a shared FHIR API", "Cut duplicate patient-record incidents by 76%", "Delivered GDPR-compliant consent management"] },
  { name: "Vantage Logistics Network Optimization", client: "Vantage Freight & Logistics", industryId: "ind-logistics", type: "Consulting Engagement", track: "business",
    desc: "Advised on route and warehouse network optimization backed by a new demand-forecasting model.",
    outcomes: ["Cut average delivery distance by 12%", "Reduced warehouse overflow incidents by 40%", "Delivered a reusable forecasting model for planning teams"] },
  { name: "Vantage Warehouse Robotics Pilot", client: "Vantage Freight & Logistics", industryId: "ind-logistics", type: "Implementation", track: "infra",
    desc: "Piloted an automated storage and retrieval system integration across two distribution centers.",
    outcomes: ["Increased pick rate by 38% in pilot sites", "Validated ROI case for national rollout", "Integrated WMS with robotics control layer"] },
];

const DAY_RATE = { junior: 480, mid: 780, senior: 1150 };
const projects = [];
const projectMembers = [];
const projectSkills = [];
const resourceAllocations = [];
const budgetPlans = [];
const projectRoleRequirements = [];
const projectRoleAssignments = [];

function peopleByTrack(trackKey) {
  return people.filter((p) => p._track === trackKey);
}
function seniorPeopleByTrack(trackKey) {
  return people.filter((p) => p._track === trackKey && p._seniority === "senior");
}

let allocIdSeq = 1;

PROJECT_DEFS.forEach((def, idx) => {
  const id = `project-${String(idx + 1).padStart(2, "0")}`;

  // status distribution across the 5 projects: one per pipeline stage, in
  // stage order (idx 0 = earliest/Lead .. idx 4 = Finished), so every badge
  // color shows up at least once in the demo data.
  let status, startDate, endDate;
  if (idx === 0) {
    status = "lead";
    const startOffset = rndInt(3, 8);
    const durationMonths = rndInt(6, 12);
    startDate = addMonths(TODAY, startOffset);
    endDate = addMonths(TODAY, startOffset + durationMonths);
  } else if (idx === 1) {
    status = "offerSent";
    const startOffset = rndInt(2, 5);
    const durationMonths = rndInt(6, 12);
    startDate = addMonths(TODAY, startOffset);
    endDate = addMonths(TODAY, startOffset + durationMonths);
  } else if (idx === 2) {
    status = "offerSigned";
    const startOffset = rndInt(1, 3);
    const durationMonths = rndInt(6, 12);
    startDate = addMonths(TODAY, startOffset);
    endDate = addMonths(TODAY, startOffset + durationMonths);
  } else if (idx === 3) {
    status = "active";
    const startOffset = -rndInt(1, 9);
    const durationMonths = rndInt(6, 16);
    startDate = addMonths(TODAY, startOffset);
    endDate = addMonths(TODAY, startOffset + durationMonths);
  } else {
    status = "finished";
    const durationMonths = rndInt(4, 10);
    const endOffset = -rndInt(1, 5);
    startDate = addMonths(TODAY, endOffset - durationMonths);
    endDate = addMonths(TODAY, endOffset);
  }

  const leadPool = seniorPeopleByTrack(def.track).length ? seniorPeopleByTrack(def.track) : peopleByTrack(def.track);
  const lead = pick(leadPool.length ? leadPool : people);

  const track = TRACKS[def.track];
  const reqSkills = sampleUnique(track.categories.flatMap(skillsByCategory), rndInt(4, 6));
  for (const s of reqSkills) projectSkills.push({ projectId: id, skillId: s.id });

  projects.push({
    id,
    name: def.name,
    clientName: def.client,
    industryId: def.industryId,
    shortDescription: def.desc,
    projectType: def.type,
    startDate: isoDate(startDate),
    endDate: isoDate(endDate),
    status,
    leadPersonId: lead.id,
    outcomes: def.outcomes,
    currency: "EUR",
    totalBudget: 0, // filled after allocations are computed
  });

  // team: lead + 2-4 additional members from primary/secondary track pools
  // (kept small since the whole company is only 10 people)
  const candidatePool = people.filter(
    (p) => p.id !== lead.id && (p._track === def.track || reqSkills.some((s) => personSkills.some((ps) => ps.personId === p.id && ps.skillId === s.id)))
  );
  const teamSize = rndInt(2, 4);
  const team = sampleUnique(candidatePool.length >= teamSize ? candidatePool : people.filter((p) => p.id !== lead.id), teamSize);

  const rolesOnProject = ["Solution Architect", "Lead Developer", "Business Analyst", "QA Engineer", "Data Engineer", "UX Designer", "DevOps Engineer", "Consultant"];
  projectMembers.push({ projectId: id, personId: lead.id, roleOnProject: "Project Lead" });
  team.forEach((member) => {
    projectMembers.push({ projectId: id, personId: member.id, roleOnProject: pick(rolesOnProject) });
  });

  // ~70% of projects also get a delivery responsible, distinct from the lead
  if (team.length > 0 && chance(0.7)) {
    const deliveryResponsible = pick(team);
    projects[projects.length - 1].deliveryResponsiblePersonId = deliveryResponsible.id;
    const membership = projectMembers.find((m) => m.projectId === id && m.personId === deliveryResponsible.id);
    if (membership) membership.roleOnProject = "Delivery Responsible";
  }

  // ~50% of projects also get a sales responsible — doesn't overwrite an
  // already-assigned "Delivery Responsible" label if the same person is picked
  if (team.length > 0 && chance(0.5)) {
    const salesResponsible = pick(team);
    projects[projects.length - 1].salesResponsiblePersonId = salesResponsible.id;
    const membership = projectMembers.find((m) => m.projectId === id && m.personId === salesResponsible.id);
    if (membership && membership.roleOnProject !== "Delivery Responsible") membership.roleOnProject = "Sales Responsible";
  }

  const allMembers = [lead, ...team];

  // monthly allocations across the project's own duration (used for history + forward horizon)
  const projEndKey = monthKey(endDate);
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const monthsInProject = [];
  while (monthKey(cursor) <= projEndKey) {
    monthsInProject.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
  }

  // only generate allocation rows for months that are within [projectStart, projectEnd] AND
  // within a generous window around "today" so the dataset stays a manageable size
  const relevantMonths = monthsInProject.filter((m) => {
    const [y, mo] = m.split("-").map(Number);
    const d = new Date(y, mo - 1, 1);
    const diff = (d.getFullYear() - TODAY.getFullYear()) * 12 + (d.getMonth() - TODAY.getMonth());
    return diff >= -6 && diff <= 11;
  });

  let projectPersonnelCost = 0;
  const monthlyCostMap = new Map();

  allMembers.forEach((member, mIdx) => {
    const baseAlloc = mIdx === 0 ? rndInt(50, 90) : rndInt(20, 80);
    relevantMonths.forEach((m) => {
      // taper allocation slightly at the very start/end of the engagement
      const isEdge = m === relevantMonths[0] || m === relevantMonths[relevantMonths.length - 1];
      const pct = Math.max(10, Math.min(100, baseAlloc + (isEdge ? -rndInt(0, 15) : rndInt(-10, 10))));
      resourceAllocations.push({
        id: `alloc-${allocIdSeq++}`,
        personId: member.id,
        projectId: id,
        month: m,
        allocationPercent: pct,
      });
      const rate = DAY_RATE[member._seniority];
      const monthCost = Math.round((pct / 100) * rate * 20);
      projectPersonnelCost += monthCost;
      monthlyCostMap.set(m, (monthlyCostMap.get(m) ?? 0) + monthCost);
    });
  });

  const monthlyPlannedCost = [...monthlyCostMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, plannedCost]) => ({ month, plannedCost }));

  const margin = 1 + rndInt(8, 22) / 100;
  const totalBudget = Math.round(projectPersonnelCost * margin);
  projects[projects.length - 1].totalBudget = totalBudget;

  budgetPlans.push({
    projectId: id,
    plannedPersonnelCost: projectPersonnelCost,
    monthlyPlannedCost,
  });

  // ---- project-level role requirements & staffing plan (weekly FTE) ----
  // Every project's team gets a full plan-vs-actual demo: one required seat
  // per team member (a role requirement) and, since they're already on the
  // project, an assignment filling that seat with them — regardless of
  // status. (Previously this only ran for "active" projects plus the first
  // few "planned" ones via a leftover `idx <= 15` threshold from the old
  // 18-project dataset — trivially true at 5 projects, so it silently
  // always matched "planned" but never "completed", leaving every
  // completed project's team invisible in the Resource & Budget Planning
  // dialog despite showing up on the project's own Team & Resource card.)
  {
    const thisProjectMembers = projectMembers.filter((m) => m.projectId === id);
    const roleGroups = new Map();
    for (const m of thisProjectMembers) {
      const person = allMembers.find((p) => p.id === m.personId);
      if (!person) continue;
      const list = roleGroups.get(m.roleOnProject) ?? [];
      list.push(person);
      roleGroups.set(m.roleOnProject, list);
    }

    const planWeeks = [];
    if (relevantMonths.length > 0) {
      const [fy, fm] = relevantMonths[0].split("-").map(Number);
      const [ly, lm] = relevantMonths[relevantMonths.length - 1].split("-").map(Number);
      let wCursor = startOfWeek(new Date(fy, fm - 1, 1));
      const wEnd = new Date(ly, lm, 0); // last day of last month
      while (wCursor <= wEnd) {
        planWeeks.push(weekKey(wCursor));
        wCursor = addWeeks(wCursor, 1);
      }
    }

    // One requirement row per seat (per team member), not per role group —
    // two Business Analysts means two separate "Business Analyst" rows,
    // each at FTE <= 1. Assignments carry no FTE of their own; they fill a
    // specific seat, so their cost is the seat's FTE * their own day rate.
    for (const [roleOnProject, members] of roleGroups) {
      members.forEach((member) => {
        const reqId = `req-${projectRoleRequirements.length + 1}`;
        const seatFte = chance(0.75) ? 1 : Math.round((0.5 + rnd() * 0.4) * 20) / 20;
        const ftePerWeek = {};
        for (const w of planWeeks) ftePerWeek[w] = seatFte;
        const planDayRate = DAY_RATE[member._seniority];
        projectRoleRequirements.push({
          id: reqId,
          projectId: id,
          roleName: roleOnProject,
          dayRate: planDayRate,
          ftePerWeek,
        });

        const ownRate = Math.round((planDayRate * (0.9 + rnd() * 0.2)) / 5) * 5;
        projectRoleAssignments.push({
          id: `asg-${projectRoleAssignments.length + 1}`,
          projectId: id,
          roleRequirementId: reqId,
          personId: member.id,
          dayRate: ownRate,
        });
      });
    }

    // The detailed weekly plan is the more authoritative cost source for a
    // project that has one — recompute totalBudget from it (+ margin) so
    // "Budget" and "Planned" stay in the same ballpark instead of the old
    // monthly-allocation-based figure (a much coarser estimate) wandering
    // arbitrarily far from the new weekly plan's own total.
    const thisProjectReqs = projectRoleRequirements.filter((r) => r.projectId === id);
    const planCost = thisProjectReqs.reduce((sum, r) => {
      const fteSum = Object.values(r.ftePerWeek).reduce((s, v) => s + v, 0);
      return sum + fteSum * r.dayRate * 5;
    }, 0);
    if (planCost > 0) {
      const planMargin = 1 + rndInt(8, 22) / 100;
      projects[projects.length - 1].totalBudget = Math.round(planCost * planMargin);
    }
  }
});

// ================= clients =================
const CONTACT_TITLES = [
  "Head of Digital",
  "VP Technology",
  "IT Director",
  "Chief Information Officer",
  "Head of Procurement",
  "Programme Director",
  "Director of Operations",
];
const clientNames = Array.from(new Set(PROJECT_DEFS.map((d) => d.client)));
const clients = clientNames.map((name) => {
  const relatedDefs = PROJECT_DEFS.filter((d) => d.client === name);
  const industryId = relatedDefs[0]?.industryId;
  const contactFirst = pick(FIRST_NAMES);
  const contactLast = pick(LAST_NAMES);
  const domain = slugify(name).replace(/-/g, "");
  return {
    id: `client-${slugify(name)}`,
    name,
    industryId,
    contactName: `${contactFirst} ${contactLast}`,
    contactEmail: `${contactFirst.toLowerCase()}.${contactLast.toLowerCase()}@${domain}.example`,
    contactPhone: `+49 ${rndInt(30, 89)} ${rndInt(1000000, 9999999)}`,
    notes: `${pick(CONTACT_TITLES)} at ${name}; primary point of contact for the ${relatedDefs.length > 1 ? "engagements" : "engagement"} with Nexus.`,
  };
});

// ---- normalize per-person monthly totals: concurrent project assignments are
// generated independently above, so the same person can easily be booked past
// 100% across several overlapping engagements. Scale each person-month's rows
// down to a realistic total, while still allowing a minority of months to land
// deliberately overallocated so that status actually varies in the UI. ----
const byPersonMonth = new Map();
for (const a of resourceAllocations) {
  const key = `${a.personId}:${a.month}`;
  const list = byPersonMonth.get(key) ?? [];
  list.push(a);
  byPersonMonth.set(key, list);
}
for (const rows of byPersonMonth.values()) {
  const total = rows.reduce((sum, r) => sum + r.allocationPercent, 0);
  if (total <= 100) continue;
  const keepOverallocated = total <= 170 && chance(0.12);
  const target = keepOverallocated ? rndInt(105, 125) : rndInt(65, 100);
  const factor = target / total;
  for (const r of rows) {
    r.allocationPercent = Math.max(5, Math.round(r.allocationPercent * factor));
  }
}

// strip internal-only fields before writing
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them from the rest spread
const cleanPeople = people.map(({ _track, _seniority, ...p }) => p);

// Role catalog: every title defined across TRACKS, plus any actually-used
// jobTitle (covers the "Senior X" variants seniority prefixing produces),
// so no generated person ever has a jobTitle missing from its own catalog.
// Static/derived only — no RNG calls, so it can't shift the seeded sequence.
const roleNames = [...new Set([...Object.values(TRACKS).flatMap((t) => t.titles), ...cleanPeople.map((p) => p.jobTitle)])].sort(
  (a, b) => a.localeCompare(b)
);
const roles = roleNames.map((name, i) => ({ id: `role-${i + 1}`, name }));

// ================= write output =================
const files = {
  "locations.json": locations,
  "industries.json": industries,
  "skills.json": skills,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from the rest spread
  "certifications.json": certifications.map(({ category, ...c }) => c),
  "interests.json": interests,
  "roles.json": roles,
  "users.json": users,
  "people.json": cleanPeople,
  "person-skills.json": personSkills,
  "person-certifications.json": personCertifications,
  "clients.json": clients,
  "projects.json": projects,
  "project-members.json": projectMembers,
  "project-skills.json": projectSkills,
  "resource-allocations.json": resourceAllocations,
  "budget-plans.json": budgetPlans,
  "project-role-requirements.json": projectRoleRequirements,
  "project-role-assignments.json": projectRoleAssignments,
};

for (const [filename, data] of Object.entries(files)) {
  writeFileSync(path.join(OUT_DIR, filename), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

console.log(`Generated demo data into ${OUT_DIR}`);
console.log(
  Object.entries(files)
    .map(([f, d]) => `  ${f}: ${d.length}`)
    .join("\n")
);
console.log(`Horizon: ${HORIZON_MONTHS[0]} .. ${HORIZON_MONTHS[HORIZON_MONTHS.length - 1]}`);
