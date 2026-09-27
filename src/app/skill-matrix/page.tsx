"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DiscoveryView } from "@/components/skill-matrix/discovery-view";
import { MatrixView } from "@/components/skill-matrix/matrix-view";
import { RoleGate } from "@/components/shared/role-gate";
import { Search, Grid3x3 } from "lucide-react";

export default function SkillMatrixPage() {
  return (
    <Suspense fallback={null}>
      <SkillMatrixPageInner />
    </Suspense>
  );
}

function SkillMatrixPageInner() {
  const searchParams = useSearchParams();
  const [skillId, setSkillId] = useState(searchParams.get("skill") ?? "");
  const [minLevel, setMinLevel] = useState(1);
  const [minAvailability, setMinAvailability] = useState(0);

  return (
    <RoleGate functionKey="skill-matrix">
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Skill Matrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover who has a skill, or scan the whole team across a category at once.
        </p>
      </div>

      <Tabs defaultValue="discovery">
        <TabsList>
          <TabsTrigger value="discovery">
            <Search className="size-3.5" /> Discovery
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Grid3x3 className="size-3.5" /> Matrix
          </TabsTrigger>
        </TabsList>
        <TabsContent value="discovery" className="mt-4">
          <DiscoveryView
            skillId={skillId}
            setSkillId={setSkillId}
            minLevel={minLevel}
            setMinLevel={setMinLevel}
            minAvailability={minAvailability}
            setMinAvailability={setMinAvailability}
          />
        </TabsContent>
        <TabsContent value="matrix" className="mt-4">
          <MatrixView />
        </TabsContent>
      </Tabs>
    </div>
    </RoleGate>
  );
}
