import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import { hashColor } from "@/lib/color-hash";
import { fullName, initials } from "@/lib/data/queries";
import { formatDate } from "@/lib/format";
import { SKILL_LEVEL_LABEL } from "@/components/shared/skill-level";
import type { Person, Location } from "@/lib/types";

export interface ProposalPersonData {
  person: Person;
  location?: Location;
  skills: { name: string; level: number }[];
  certifications: { name: string; issuer: string }[];
  industries: string[];
  projects: { name: string; clientName: string; roleOnProject: string; description: string }[];
}

// Brand palette — kept identical to the app's own tokens (src/app/globals.css)
// so the PDF reads as the same product, not a generic export.
const NAVY = "#2c2f3a";
const ORANGE = "#ff961e";
const AMBER = "#fdb42e";
const SLATE = "#747b95";
const INK = "#20222b";
const MUTED = "#6d7286";
const PAPER = "#fcfcfd";
const HAIRLINE = "#e2e3e8";

// Avatars are drawn as color-hashed initials (same scheme as ClientLogo)
// rather than fetching each person's real photo — avoids depending on
// third-party image hosts (CORS, latency, load failures) being reachable
// at PDF-generation time.
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
  // ---- cover page ----
  coverPage: {
    backgroundColor: NAVY,
    padding: 56,
    fontFamily: "Helvetica",
    color: "#ffffff",
  },
  coverEyebrow: { fontSize: 10, color: AMBER, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase" },
  coverBrand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: ORANGE, marginTop: 6 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 90, lineHeight: 1.15 },
  coverRule: { height: 3, width: 64, backgroundColor: ORANGE, marginTop: 18 },
  coverMetaRow: { flexDirection: "row", gap: 28, marginTop: 22 },
  coverMetaLabel: { fontSize: 8, color: "#9aa0c8", textTransform: "uppercase", letterSpacing: 1 },
  coverMetaValue: { fontSize: 10.5, color: "#ffffff", marginTop: 3 },
  coverListWrap: { marginTop: 56, flexGrow: 1 },
  coverListTitle: { fontSize: 9, color: "#9aa0c8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 },
  coverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#3d4152",
  },
  coverAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  coverAvatarText: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  coverRowName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  coverRowRole: { fontSize: 9, color: "#b7bcda", marginTop: 1 },
  coverFooter: { position: "absolute", bottom: 40, left: 56, right: 56, fontSize: 8, color: "#9aa0c8" },
  // ---- one-pager ----
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
  skillGrid: { flexDirection: "row", flexWrap: "wrap" },
  skillItem: { width: "50%", flexDirection: "row", justifyContent: "space-between", paddingRight: 12, marginBottom: 5 },
  skillName: { fontSize: 9 },
  skillLevel: { fontSize: 8, color: MUTED },
  certRow: { marginBottom: 4 },
  certName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  certIssuer: { fontSize: 8, color: MUTED },
  projectBlock: { marginBottom: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: HAIRLINE },
  projectTitleRow: { flexDirection: "row", justifyContent: "space-between" },
  projectName: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: NAVY },
  projectRole: { fontSize: 8, color: SLATE },
  projectClient: { fontSize: 8, color: MUTED, marginTop: 1 },
  projectDesc: { fontSize: 8.5, color: INK, marginTop: 3, lineHeight: 1.4 },
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

function CoverPage({ people, preparedBy, preparedDate }: { people: ProposalPersonData[]; preparedBy?: string; preparedDate: string }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverEyebrow}>Internal Company Platform</Text>
      <Text style={styles.coverBrand}>Nexus</Text>
      <Text style={styles.coverTitle}>Staffing{"\n"}Proposal</Text>
      <View style={styles.coverRule} />

      <View style={styles.coverMetaRow}>
        {preparedBy && (
          <View>
            <Text style={styles.coverMetaLabel}>Prepared by</Text>
            <Text style={styles.coverMetaValue}>{preparedBy}</Text>
          </View>
        )}
        <View>
          <Text style={styles.coverMetaLabel}>Date</Text>
          <Text style={styles.coverMetaValue}>{preparedDate}</Text>
        </View>
        <View>
          <Text style={styles.coverMetaLabel}>Candidates</Text>
          <Text style={styles.coverMetaValue}>{people.length}</Text>
        </View>
      </View>

      <View style={styles.coverListWrap}>
        <Text style={styles.coverListTitle}>Included in this proposal</Text>
        {people.map(({ person }) => {
          const { bg, fg } = hashColor(fullName(person));
          return (
            <View key={person.id} style={styles.coverRow}>
              <View style={[styles.coverAvatar, { backgroundColor: bg }]}>
                <Text style={[styles.coverAvatarText, { color: fg }]}>{initials(person)}</Text>
              </View>
              <View>
                <Text style={styles.coverRowName}>{fullName(person)}</Text>
                <Text style={styles.coverRowRole}>
                  {person.jobTitle} · {person.department}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.coverFooter} fixed>
        Nexus Company Platform — internal use only
      </Text>
    </Page>
  );
}

function OnePager({ data, preparedBy, preparedDate }: { data: ProposalPersonData; preparedBy?: string; preparedDate: string }) {
  const { person, location, skills, certifications, industries, projects } = data;
  const { bg, fg } = hashColor(fullName(person));

  return (
    <Page size="A4" style={styles.page}>
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
            {location && (
              <Text style={styles.meta}>
                {location.city}, {location.country}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.brand}>
          <Text style={styles.brandName}>Nexus</Text>
          <Text style={styles.brandTag}>Candidate proposal</Text>
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

      <View style={[styles.section, styles.twoColRow]}>
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

      {skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillGrid}>
            {skills.slice(0, 8).map((s) => (
              <View key={s.name} style={styles.skillItem}>
                <Text style={styles.skillName}>{s.name}</Text>
                <Text style={styles.skillLevel}>{SKILL_LEVEL_LABEL[s.level as 1 | 2 | 3 | 4 | 5] ?? s.level}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          {certifications.slice(0, 5).map((c) => (
            <View key={c.name} style={styles.certRow}>
              <Text style={styles.certName}>{c.name}</Text>
              <Text style={styles.certIssuer}>{c.issuer}</Text>
            </View>
          ))}
        </View>
      )}

      {projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relevant Project Experience</Text>
          {projects.slice(0, 3).map((p, i) => (
            <View key={i} style={styles.projectBlock}>
              <View style={styles.projectTitleRow}>
                <Text style={styles.projectName}>{p.name}</Text>
                <Text style={styles.projectRole}>{p.roleOnProject}</Text>
              </View>
              <Text style={styles.projectClient}>{p.clientName}</Text>
              <Text style={styles.projectDesc}>{p.description}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer} fixed>
        <Text>{preparedBy ? `Prepared by ${preparedBy}` : "Nexus staffing proposal"}</Text>
        <Text>{preparedDate}</Text>
      </View>
    </Page>
  );
}

function ProposalDocument({
  people,
  preparedBy,
}: {
  people: ProposalPersonData[];
  preparedBy?: string;
}) {
  const preparedDate = formatDate(new Date().toISOString().slice(0, 10));
  return (
    <Document title="Nexus Staffing Proposal">
      <CoverPage people={people} preparedBy={preparedBy} preparedDate={preparedDate} />
      {people.map((data) => (
        <OnePager key={data.person.id} data={data} preparedBy={preparedBy} preparedDate={preparedDate} />
      ))}
    </Document>
  );
}

export async function downloadStaffingProposal(people: ProposalPersonData[], preparedBy?: string) {
  const blob = await pdf(<ProposalDocument people={people} preparedBy={preparedBy} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `staffing-proposal-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
