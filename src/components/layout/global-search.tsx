"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppStore } from "@/store/app-store-provider";
import { buildSearchIndex, filterSearchIndex, type SearchResultType } from "@/lib/search-index";
import { Users, FolderKanban, Grid3x3, Building2, Landmark, Award } from "lucide-react";

const TYPE_META: Record<SearchResultType, { label: string; icon: typeof Users }> = {
  person: { label: "People", icon: Users },
  project: { label: "Projects", icon: FolderKanban },
  skill: { label: "Skills", icon: Grid3x3 },
  client: { label: "Customers", icon: Building2 },
  industry: { label: "Industries", icon: Landmark },
  certification: { label: "Certifications", icon: Award },
};

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const people = useAppStore((s) => s.people);
  const projects = useAppStore((s) => s.projects);
  const skills = useAppStore((s) => s.skills);
  const industries = useAppStore((s) => s.industries);
  const certifications = useAppStore((s) => s.certifications);
  const personSkills = useAppStore((s) => s.personSkills);
  const projectSkills = useAppStore((s) => s.projectSkills);
  const clients = useAppStore((s) => s.clients);
  const locations = useAppStore((s) => s.locations);

  const index = useMemo(
    () =>
      buildSearchIndex({ people, projects, skills, industries, certifications, personSkills, projectSkills, clients, locations }),
    [people, projects, skills, industries, certifications, personSkills, projectSkills, clients, locations]
  );

  const results = useMemo(() => filterSearchIndex(index, query), [index, query]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultType, typeof results>();
    for (const r of results) {
      const list = map.get(r.type) ?? [];
      list.push(r);
      map.set(r.type, list);
    }
    return map;
  }, [results]);

  function handleOpenChange(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Global search"
      description="Search people, projects, skills, clients, industries and certifications"
    >
      <CommandInput
        placeholder="Search people, projects, skills, clients…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() === "" ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Try “AWS”, “Automotive”, or a colleague’s name.
          </div>
        ) : (
          <CommandEmpty>No results for “{query}”.</CommandEmpty>
        )}
        {Array.from(grouped.entries()).map(([type, items]) => {
          const meta = TYPE_META[type];
          return (
            <CommandGroup key={type} heading={meta.label}>
              {items.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.type}-${item.id}-${item.title}`}
                  onSelect={() => {
                    handleOpenChange(false);
                    router.push(item.href);
                  }}
                >
                  <meta.icon className="text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
