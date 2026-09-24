"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2 } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { getProjectsForClient } from "@/lib/data/queries";
import { ClientLogo } from "@/components/shared/client-logo";
import { ProjectMiniCard } from "@/components/projects/project-mini-card";
import { CustomerFormSheet } from "@/components/customers/customer-form-sheet";
import { Card } from "@/components/ui/card";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const role = useAppStore((s) => s.viewAsRole);
  const clients = useAppStore((s) => s.clients);
  const industries = useAppStore((s) => s.industries);
  const projects = useAppStore((s) => s.projects);

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="font-heading text-lg font-semibold">Customer not found</p>
        <Link href="/customers" className="text-sm text-primary hover:underline">
          Back to Customers
        </Link>
      </div>
    );
  }

  const industry = industries.find((i) => i.id === client.industryId);
  const clientProjects = getProjectsForClient(projects, client.name);
  const canEdit = role === "admin";

  return (
    <div className="flex flex-col gap-6 pb-8">
      <Link href="/customers" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Customers
      </Link>

      <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 shadow-elevation-1 sm:flex-row sm:items-center">
        <ClientLogo name={client.name} logoUrl={client.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{client.name}</h1>
          {industry && (
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-3.5" /> {industry.name}
            </p>
          )}
        </div>
        {canEdit && <CustomerFormSheet client={client} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {client.notes && (
            <Card className="p-6 shadow-elevation-1">
              <h2 className="font-heading text-base font-semibold">Notes</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{client.notes}</p>
            </Card>
          )}

          {clientProjects.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-base font-semibold">
                Project experience ({clientProjects.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {clientProjects.map((p) => (
                  <ProjectMiniCard key={p.id} project={p} clients={clients} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5 shadow-elevation-1">
            <h2 className="font-heading text-sm font-semibold">Contact</h2>
            {client.contactName || client.contactEmail || client.contactPhone ? (
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {client.contactName && <p className="font-medium text-foreground">{client.contactName}</p>}
                {client.contactEmail && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="size-3.5" /> {client.contactEmail}
                  </p>
                )}
                {client.contactPhone && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3.5" /> {client.contactPhone}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No contact details yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
