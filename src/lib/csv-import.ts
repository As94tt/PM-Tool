export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}

export const PEOPLE_IMPORT_FIELDS: ImportField[] = [
  { key: "firstName", label: "First name", required: true },
  { key: "lastName", label: "Last name", required: true },
  { key: "jobTitle", label: "Job title", required: true },
  { key: "department", label: "Department (IT Solutions / Development / Data / 5G)" },
  { key: "city", label: "Location (city)" },
  { key: "bio", label: "Bio" },
];

export const PROJECT_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Project name", required: true },
  { key: "clientName", label: "Client", required: true },
  { key: "industry", label: "Industry" },
  { key: "projectType", label: "Project type" },
  { key: "status", label: "Status (planned / active / completed)" },
  { key: "startDate", label: "Start date (YYYY-MM-DD)" },
  { key: "shortDescription", label: "Description" },
];

/** Best-effort auto-mapping from CSV header text to a target field key. */
export function guessMapping(headers: string[], fields: ImportField[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of fields) {
    const match = headers.find((h) => {
      const norm = h.trim().toLowerCase().replace(/[\s_-]/g, "");
      const key = field.key.toLowerCase();
      const label = field.label.toLowerCase().replace(/[\s_-]/g, "").split("(")[0];
      return norm === key || norm === label || norm.includes(key);
    });
    if (match) mapping[field.key] = match;
  }
  return mapping;
}

export interface ValidatedRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
}

export function validateRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  fields: ImportField[]
): ValidatedRow[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    const errors: string[] = [];
    for (const field of fields) {
      const sourceCol = mapping[field.key];
      const value = sourceCol ? (row[sourceCol] ?? "").trim() : "";
      data[field.key] = value;
      if (field.required && !value) errors.push(`Missing ${field.label}`);
    }
    return { rowIndex, data, errors };
  });
}
