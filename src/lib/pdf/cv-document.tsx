import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import { hashColor } from "@/lib/color-hash";
import { fullName, initials } from "@/lib/data/queries";
import { formatDate, todayLocalDate } from "@/lib/format";
import { formatMonthLabel } from "@/lib/data/capacity";
import { SKILL_LEVEL_LABEL } from "@/components/shared/skill-level";
import { NAVY, ORANGE, AMBER, SLATE, INK, MUTED, PAPER, HAIRLINE } from "@/lib/pdf/brand";
import type { Person, Location } from "@/lib/types";

export interface CVSkillGroup {
  category: string;
  skills: { name: string; level: number }[];
}

export interface CVCertification {
  name: string;
  issuer: string;
  expiryDate?: string;
}

export interface CVProjectEntry {
  projectName: string;
  clientName: string;
  roleOnProject: string;
  /** "YYYY-MM" — this person's own tenure on the project, derived from
   * their ResourceAllocation rows, not the project's own start/end dates.
   * Null when there's no allocation history to derive from at all. */
  startMonth: string | null;
  endMonth: string | null;
  ongoing: boolean;
  description: string;
  outcomes: string[];
  technologies: string[];
}

export interface CVData {
  person: Person;
  location?: Location;
  email?: string;
  skillGroups: CVSkillGroup[];
  certifications: CVCertification[];
  industries: string[];
  projects: CVProjectEntry[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: INK,
    backgroundColor: PAPER,
  },
  // ---- cover ----
  coverPage: { backgroundColor: NAVY, padding: 56, fontFamily: "Helvetica", color: "#ffffff" },
  coverEyebrow: { fontSize: 10, color: AMBER, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase" },
  coverBrand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: ORANGE, marginTop: 6 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 70 },
  coverRule: { height: 3, width: 64, backgroundColor: ORANGE, marginTop: 18 },
  coverAvatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 40 },
  coverAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  coverAvatarText: { fontFamily: "Helvetica-Bold", fontSize: 22 },
  coverName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  coverRole: { fontSize: 11, color: "#b7bcda", marginTop: 3 },
  coverMetaRow: { flexDirection: "row", gap: 28, marginTop: 40 },
  coverMetaLabel: { fontSize: 8, color: "#9aa0c8", textTransform: "uppercase", letterSpacing: 1 },
  coverMetaValue: { fontSize: 10.5, color: "#ffffff", marginTop: 3 },
  coverFooter: { position: "absolute", bottom: 40, left: 56, right: 56, fontSize: 8, color: "#9aa0c8" },
  // ---- content ----
  headerBar: { height: 5, backgroundColor: ORANGE, marginHorizontal: -44, marginTop: -44, marginBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  avatarWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Helvetica-Bold", fontSize: 15 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 17, color: NAVY, marginBottom: 2 },
  subtitle: { fontSize: 10, color: SLATE },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  brand: { alignItems: "flex-end" },
  brandName: { fontFamily: "Helvetica-Bold", fontSize: 12, color: ORANGE },
  brandTag: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  section: { marginTop: 15 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: NAVY,
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: AMBER,
    paddingBottom: 4,
  },
  bio: { fontSize: 9.5, lineHeight: 1.5, color: INK },
  twoColRow: { flexDirection: "row", gap: 28 },
  twoColCol: { flex: 1 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "#eef0f4", borderRadius: 4, paddingVertical: 3, paddingHorizontal: 7, fontSize: 8.5, color: NAVY },
  techChip: { backgroundColor: "#f1f2f5", borderRadius: 4, paddingVertical: 2.5, paddingHorizontal: 6, fontSize: 7.5, color: SLATE },
  strengthChip: {
    backgroundColor: "#fff2df",
    color: "#8a5300",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  langRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  langName: { fontSize: 9 },
  langLevel: { fontSize: 8, color: MUTED },
  skillCategory: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginTop: 8 },
  skillGrid: { flexDirection: "row", flexWrap: "wrap" },
  skillItem: { width: "50%", flexDirection: "row", justifyContent: "space-between", paddingRight: 12, marginBottom: 5 },
  skillName: { fontSize: 9 },
  skillLevel: { fontSize: 8, color: MUTED },
  certRow: { marginBottom: 6 },
  certName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  certMeta: { fontSize: 8, color: MUTED },
  projectBlock: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: HAIRLINE },
  projectTitleRow: { flexDirection: "row", justifyContent: "space-between" },
  projectName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY },
  projectDates: { fontSize: 8.5, color: SLATE },
  projectSubRow: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  projectDesc: { fontSize: 9, color: INK, marginTop: 4, lineHeight: 1.45 },
  outcomeRow: { flexDirection: "row", marginTop: 3, gap: 5 },
  outcomeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: ORANGE, marginTop: 4 },
  outcomeText: { fontSize: 8.5, color: INK, flex: 1, lineHeight: 1.35 },
  techRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 6,
  },
});

function tenureLabel(entry: CVProjectEntry): string {
  const start = entry.startMonth ? formatMonthLabel(entry.startMonth, { month: "short", year: "numeric" }) : "—";
  const end = entry.ongoing ? "Ongoing" : entry.endMonth ? formatMonthLabel(entry.endMonth, { month: "short", year: "numeric" }) : start;
  return `${start} – ${end}`;
}

function CoverPage({ data, preparedDate }: { data: CVData; preparedDate: string }) {
  const { person, location } = data;
  const { bg, fg } = hashColor(fullName(person));

  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverEyebrow}>Internal Company Platform</Text>
      <Text style={styles.coverBrand}>Nexus</Text>
      <Text style={styles.coverTitle}>Curriculum Vitae</Text>
      <View style={styles.coverRule} />

      <View style={styles.coverAvatarRow}>
        <View style={[styles.coverAvatar, { backgroundColor: bg }]}>
          <Text style={[styles.coverAvatarText, { color: fg }]}>{initials(person)}</Text>
        </View>
        <View>
          <Text style={styles.coverName}>{fullName(person)}</Text>
          <Text style={styles.coverRole}>
            {person.jobTitle} · {person.department}
          </Text>
        </View>
      </View>

      <View style={styles.coverMetaRow}>
        {location && (
          <View>
            <Text style={styles.coverMetaLabel}>Location</Text>
            <Text style={styles.coverMetaValue}>
              {location.city}, {location.country}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.coverMetaLabel}>With Nexus since</Text>
          <Text style={styles.coverMetaValue}>{formatDate(person.joinedDate)}</Text>
        </View>
        <View>
          <Text style={styles.coverMetaLabel}>Generated</Text>
          <Text style={styles.coverMetaValue}>{preparedDate}</Text>
        </View>
      </View>

      <Text style={styles.coverFooter} fixed>
        Nexus Company Platform — internal use only
      </Text>
    </Page>
  );
}

function ContentPage({ data }: { data: CVData }) {
  const { person, location, email, skillGroups, certifications, industries, projects } = data;
  const { bg, fg } = hashColor(fullName(person));

  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.headerBar} fixed />

      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: bg }]}>
            <Text style={[styles.avatarText, { color: fg }]}>{initials(person)}</Text>
          </View>
          <View>
            <Text style={styles.name}>{fullName(person)}</Text>
            <Text style={styles.subtitle}>
              {person.jobTitle} · {person.department}
            </Text>
            <Text style={styles.meta}>
              {location ? `${location.city}, ${location.country}` : ""}
              {email ? `  ·  ${email}` : ""}
            </Text>
          </View>
        </View>
        <View style={styles.brand}>
          <Text style={styles.brandName}>Nexus</Text>
          <Text style={styles.brandTag}>Curriculum Vitae</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{person.bio}</Text>
      </View>

      {person.projectStrengths.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Strengths</Text>
          <View style={styles.chipsRow}>
            {person.projectStrengths.map((strength) => (
              <Text key={strength} style={styles.strengthChip}>
                {strength}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.section, styles.twoColRow]} wrap={false}>
        {industries.length > 0 && (
          <View style={styles.twoColCol}>
            <Text style={styles.sectionTitle}>Industry Experience</Text>
            <View style={styles.chipsRow}>
              {industries.map((name) => (
                <Text key={name} style={styles.chip}>
                  {name}
                </Text>
              ))}
            </View>
          </View>
        )}
        {person.languages.length > 0 && (
          <View style={styles.twoColCol}>
            <Text style={styles.sectionTitle}>Languages</Text>
            {person.languages.map((lang) => (
              <View key={lang.name} style={styles.langRow}>
                <Text style={styles.langName}>{lang.name}</Text>
                <Text style={styles.langLevel}>{lang.proficiency}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {skillGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          {skillGroups.map((group) => (
            <View key={group.category} wrap={false}>
              <Text style={styles.skillCategory}>{group.category}</Text>
              <View style={styles.skillGrid}>
                {group.skills.map((s) => (
                  <View key={s.name} style={styles.skillItem}>
                    <Text style={styles.skillName}>{s.name}</Text>
                    <Text style={styles.skillLevel}>{SKILL_LEVEL_LABEL[s.level as 1 | 2 | 3 | 4 | 5] ?? s.level}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          {certifications.map((c) => (
            <View key={c.name} style={styles.certRow} wrap={false}>
              <Text style={styles.certName}>{c.name}</Text>
              <Text style={styles.certMeta}>
                {c.issuer}
                {c.expiryDate ? ` · Expires ${formatDate(c.expiryDate)}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Experience</Text>
          {projects.map((p, i) => (
            <View key={i} style={styles.projectBlock} wrap={false}>
              <View style={styles.projectTitleRow}>
                <Text style={styles.projectName}>{p.projectName}</Text>
                <Text style={styles.projectDates}>{tenureLabel(p)}</Text>
              </View>
              <Text style={styles.projectSubRow}>
                {p.roleOnProject} · {p.clientName}
              </Text>
              <Text style={styles.projectDesc}>{p.description}</Text>
              {p.outcomes.slice(0, 3).map((outcome, oi) => (
                <View key={oi} style={styles.outcomeRow}>
                  <View style={styles.outcomeDot} />
                  <Text style={styles.outcomeText}>{outcome}</Text>
                </View>
              ))}
              {p.technologies.length > 0 && (
                <View style={styles.techRow}>
                  {p.technologies.map((tech) => (
                    <Text key={tech} style={styles.techChip}>
                      {tech}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Text
        style={styles.footer}
        fixed
        render={({ pageNumber, totalPages }) => `${fullName(person)} — CV  ·  Page ${pageNumber} of ${totalPages}`}
      />
    </Page>
  );
}

function CVDocument({ data }: { data: CVData }) {
  const preparedDate = formatDate(todayLocalDate());
  return (
    <Document title={`${fullName(data.person)} — CV`}>
      <CoverPage data={data} preparedDate={preparedDate} />
      <ContentPage data={data} />
    </Document>
  );
}

export async function downloadCV(data: CVData) {
  const blob = await pdf(<CVDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.person.firstName}-${data.person.lastName}-CV.pdf`.toLowerCase();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
