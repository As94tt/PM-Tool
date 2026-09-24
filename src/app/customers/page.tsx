"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Building2 } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { getProjectsForClient } from "@/lib/data/queries";
import { selectLabel } from "@/lib/select-utils";
import { ClientLogo } from "@/components/shared/client-logo";
import { CustomerFormSheet } from "@/components/customers/customer-form-sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function CustomersPage() {
  const role = useAppStore((s) => s.viewAsRole);
  const clients = useAppStore((s) => s.clients);
  const industries = useAppStore((s) => s.industries);
  const projects = useAppStore((s) => s.projects);

  const [query, setQuery] = useState("");
  const [industryId, setIndustryId] = useState("");

  const industryOptions = [{ value: "any", label: "All industries" }, ...industries.map((i) => ({ value: i.id, label: i.name }))];

  const results = clients.filter((c) => {
    if (query && !`${c.name} ${c.contactName ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (industryId && c.industryId !== industryId) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client companies, contacts and branding used across project experience.
          </p>
        </div>
        {role === "admin" && <CustomerFormSheet />}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevation-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or contact…" className="pl-9" />
        </div>
        <div className="mt-3">
          <Select value={industryId || "any"} onValueChange={(v) => setIndustryId(v && v !== "any" ? v : "")}>
            <SelectTrigger size="sm" className="w-[190px]">
              <SelectValue>{selectLabel(industryOptions, "Industry")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {industryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "customer" : "customers"} found
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <div>
            <p className="font-heading text-lg font-semibold">No customers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((client) => {
            const industry = industries.find((i) => i.id === client.industryId);
            const clientProjects = getProjectsForClient(projects, client.name);
            return (
              <Link
                key={client.id}
                href={`/customers/${client.id}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-elevation-1 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <ClientLogo name={client.name} logoUrl={client.logoUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-semibold text-foreground group-hover:text-primary">
                      {client.name}
                    </p>
                    {industry && <p className="truncate text-xs text-muted-foreground">{industry.name}</p>}
                  </div>
                </div>
                {client.contactName && (
                  <p className="mt-3 truncate text-sm text-muted-foreground">
                    {client.contactName}
                    {client.contactEmail ? ` · ${client.contactEmail}` : ""}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                  <Badge variant="secondary" className="font-normal">
                    {clientProjects.length} project{clientProjects.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
