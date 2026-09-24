import { ClientLogo } from "@/components/shared/client-logo";
import { getClientByName } from "@/lib/data/queries";
import type { Client, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZE_CLASS = { sm: "size-8", md: "size-10", lg: "size-14", xl: "size-28" };
const RING_CLASS = { sm: "ring-2", md: "ring-2", lg: "ring-2", xl: "ring-4" };

/**
 * A project's visual identifier: its own picture when set (shown like a
 * profile picture, rounded-full), otherwise the client's logo/initials.
 */
export function ProjectAvatar({
  project,
  clients,
  size = "md",
  className,
}: {
  project: Project;
  clients: Client[];
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  if (project.imageUrl) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-full ring-background",
          SIZE_CLASS[size],
          RING_CLASS[size],
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-provided data URL/external URL */}
        <img src={project.imageUrl} alt="" className="size-full object-cover" />
      </div>
    );
  }

  const client = getClientByName(clients, project.clientName);
  return <ClientLogo name={project.clientName} logoUrl={client?.logoUrl} size={size} className={className} />;
}
