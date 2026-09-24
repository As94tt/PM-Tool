"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { GlobalSearch } from "./global-search";

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/70">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <button
        onClick={() => setSearchOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40 hover:bg-secondary"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search people, projects, skills…</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
