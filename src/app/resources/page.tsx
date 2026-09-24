"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RoleGate } from "@/components/shared/role-gate";
import { ResourcePlanningView } from "@/components/resources/resource-planning-view";
import { BudgetView } from "@/components/resources/budget-view";
import { CalendarRange, Wallet } from "lucide-react";

export default function ResourcesPage() {
  return (
    <RoleGate allow={["management", "admin"]}>
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Budget & Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan allocations across the next 12 months and track high-level project budgets.
          </p>
        </div>

        <Tabs defaultValue="planning">
          <TabsList>
            <TabsTrigger value="planning">
              <CalendarRange className="size-3.5" /> Resource Planning
            </TabsTrigger>
            <TabsTrigger value="budget">
              <Wallet className="size-3.5" /> Budget Planning
            </TabsTrigger>
          </TabsList>
          <TabsContent value="planning" className="mt-4">
            <ResourcePlanningView />
          </TabsContent>
          <TabsContent value="budget" className="mt-4">
            <BudgetView />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
