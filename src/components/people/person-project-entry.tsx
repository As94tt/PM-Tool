"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store-provider";
import { ProjectMiniCard } from "@/components/projects/project-mini-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Project } from "@/lib/types";

/** A project card on a person's profile page, with their own "what I did"
 * note shown and editable right there — the same field EditProfileSheet's
 * Projects section edits, just surfaced without needing to open that sheet. */
export function PersonProjectEntry({
  project,
  clients,
  personId,
  roleOnProject,
  contributionDescription,
  canEdit,
}: {
  project: Project;
  clients: Client[];
  personId: string;
  roleOnProject: string;
  contributionDescription?: string;
  canEdit: boolean;
}) {
  const updateProjectMemberContribution = useAppStore((s) => s.updateProjectMemberContribution);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(contributionDescription ?? "");

  function save() {
    updateProjectMemberContribution(personId, project.id, draft.trim());
    toast.success("Project details updated");
  }

  return (
    <div className="flex flex-col gap-2">
      <ProjectMiniCard project={project} clients={clients} roleOnProject={roleOnProject} />
      <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
        {!expanded && (
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-xs whitespace-pre-wrap text-muted-foreground">
              {contributionDescription || <span className="italic">No details added yet.</span>}
            </p>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto shrink-0 px-1.5 py-0.5 text-xs text-muted-foreground"
                onClick={() => {
                  setDraft(contributionDescription ?? "");
                  setExpanded(true);
                }}
              >
                {contributionDescription ? "Edit details" : "Add details"}
              </Button>
            )}
          </div>
        )}
        {expanded && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">What I did on this project (shown on the CV)</Label>
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              placeholder="Led requirements workshops, delivered the FHIR integration layer…"
              autoFocus
              className="text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-fit self-end px-1.5 py-0.5 text-xs text-muted-foreground"
              onClick={() => setExpanded(false)}
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
