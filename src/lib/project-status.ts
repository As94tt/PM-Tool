import type { ProjectStatus } from "@/lib/types";

export const PROJECT_STATUSES: ProjectStatus[] = ["lead", "offerSent", "offerSigned", "active", "finished"];

/** A project hasn't started delivery yet — still somewhere in the sales
 * pipeline. Used to redefine what used to be the single "planned" bucket
 * across dashboard stats and a person's "upcoming projects" list. */
export const PRE_ACTIVE_STATUSES: ProjectStatus[] = ["lead", "offerSent", "offerSigned"];

/** A project firm enough that a person's booking against it counts as
 * "secure" rather than tentative — a signed contract is a real commitment
 * even before delivery starts, and a finished project is history, not a
 * pipeline risk, so both count as certain alongside Active. Only a bare
 * Lead or a sent-but-unsigned offer could still fall through. Used by the
 * Resource Planning grid to flag allocation that isn't yet certain. */
export const SECURE_ALLOCATION_STATUSES: ProjectStatus[] = ["active", "offerSigned", "finished"];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  lead: "Lead",
  offerSent: "Offer Sent",
  offerSigned: "Offer Signed",
  active: "Active",
  finished: "Finished",
};

/** Badge classes per status. Lead reuses the brand's own primary orange (an
 * early-pipeline stage worth drawing the eye to); Offer Sent reuses the
 * existing --warning amber token (nothing else in the app uses it yet);
 * Offer Signed and Active are deliberately both green, via the same
 * --status-healthy token already documented as the general "confirmed/good"
 * project-status color (also used for department dots and CSV-import
 * success states — reusing it here, not repurposing it); Finished keeps the
 * old "completed" neutral grey style unchanged. */
export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  lead: "bg-primary/15 text-primary",
  offerSent: "bg-warning/15 text-warning",
  offerSigned: "bg-status-healthy/15 text-status-healthy",
  active: "bg-status-healthy/15 text-status-healthy",
  finished: "bg-secondary text-muted-foreground",
};

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = PROJECT_STATUSES.map((value) => ({
  value,
  label: PROJECT_STATUS_LABEL[value],
}));
