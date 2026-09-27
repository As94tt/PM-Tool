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

// Avatars are drawn as color-hashed initials (same scheme as ClientLogo)
// rather than fetching each person's real photo — avoids depending on
// third-party image hosts (CORS, latency, load failures) being reachable
// at PDF-generation time.
const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 36, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1c1e26" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  avatarWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 2 },
  subtitle: { fontSize: 10.5, color: "#52586b" },
  meta: { fontSize: 9, color: "#747b95", marginTop: 2 },
  brand: { alignItems: "flex-end" },
  brandName: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#ff961e" },
  brandTag: { fontSize: 8, color: "#747b95" },
  section: { marginTop: 16 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#424d68", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  bio: { fontSize: 10, lineHeight: 1.5, color: "#2c2f3a" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "#f1f2f5", borderRadius: 4, paddingVertical: 3, paddingHorizontal: 7, fontSize: 9, color: "#2c2f3a" },
  skillGrid: { flexDirection: "row", flexWrap: "wrap" },
  skillItem: { width: "50%", flexDirection: "row", justifyContent: "space-between", paddingRight: 12, marginBottom: 5 },
  skillName: { fontSize: 9.5 },
  skillLevel: { fontSize: 8.5, color: "#747b95" },
  certRow: { marginBottom: 4 },
  certName: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  certIssuer: { fontSize: 8.5, color: "#747b95" },
  projectBlock: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e5e6ea" },
  projectTitleRow: { flexDirection: "row", justifyContent: "space-between" },
  projectName: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  projectRole: { fontSize: 8.5, color: "#747b95" },
  projectClient: { fontSize: 8.5, color: "#52586b", marginTop: 1 },
  projectDesc: { fontSize: 9, color: "#2c2f3a", marginTop: 3, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#a3a9bb" },
});

function OnePager({ data, preparedBy, preparedDate }: { data: ProposalPersonData; preparedBy?: string; preparedDate: string }) {
  const { person, location, skills, certifications, industries, projects } = data;
  const { bg, fg } = hashColor(fullName(person));

  return (
    <Page size="A4" style={styles.page}>
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
            {location && <Text style={styles.meta}>{location.city}, {location.country}</Text>}
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

      {industries.length > 0 && (
        <View style={styles.section}>
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

      {skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillGrid}>
            {skills.slice(0, 10).map((s) => (
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
          {certifications.slice(0, 6).map((c) => (
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
