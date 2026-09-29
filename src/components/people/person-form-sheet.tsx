"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/app-store-provider";
import { selectLabel } from "@/lib/select-utils";
import { todayLocalDate } from "@/lib/format";
import { DEPARTMENTS, type Department, type Person } from "@/lib/types";

export function PersonFormSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const locations = useAppStore((s) => s.locations);
  const industries = useAppStore((s) => s.industries);
  const interests = useAppStore((s) => s.interests);
  const roles = useAppStore((s) => s.roles);
  const importPeople = useAppStore((s) => s.importPeople);
  const addUser = useAppStore((s) => s.addUser);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState(roles[0]?.name ?? "");
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [bio, setBio] = useState("");
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [industryIds, setIndustryIds] = useState<string[]>([]);

  const locationOptions = locations.map((l) => ({ value: l.id, label: l.city }));
  const roleOptions = roles.map((r) => ({ value: r.name, label: r.name }));

  function toggleInterest(id: string) {
    setInterestIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }
  function toggleIndustry(id: string) {
    setIndustryIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setJobTitle(roles[0]?.name ?? "");
    setBio("");
    setInterestIds([]);
    setIndustryIds([]);
  }

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !jobTitle.trim() || !email.trim()) {
      toast.error("First name, last name, email and job title are required");
      return;
    }

    const id = `person-${Date.now()}`;
    const newPerson: Person = {
      id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(id)}`,
      jobTitle: jobTitle.trim(),
      department,
      locationId,
      bio: bio.trim() || `${firstName.trim()} recently joined the team as ${jobTitle.trim()}.`,
      interestIds,
      industryExperienceIds: industryIds,
      joinedDate: todayLocalDate(),
      languages: [],
      projectStrengths: [],
      whyThisPerson: "",
    };

    importPeople([newPerson]);
    // Every new registration starts as a User — a real SSO claim will
    // eventually replace this, but the role still needs to start somewhere.
    addUser({ personId: id, email: email.trim(), role: "user" });
    toast.success("Person added");
    setOpen(false);
    reset();
    router.push(`/people/${id}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <UserPlus /> New person
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border">
          <SheetTitle>New person</SheetTitle>
          <SheetDescription>
            Add a colleague to the directory. Skills, certifications, languages and project strengths can be
            added afterwards from their profile.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100svh-10rem)]">
          <div className="flex flex-col gap-5 px-6 py-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="np-first" className="mb-1.5">
                  First name
                </Label>
                <Input id="np-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <Label htmlFor="np-last" className="mb-1.5">
                  Last name
                </Label>
                <Input id="np-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="np-email" className="mb-1.5">
                  Email
                </Label>
                <Input
                  id="np-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@nexuscorp.example"
                />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5">Job title / role</Label>
                <Select value={jobTitle} onValueChange={(v) => v && setJobTitle(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(roleOptions, "Select a role")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Department</Label>
                <Select value={department} onValueChange={(v) => v && setDepartment(v as Department)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(DEPARTMENTS.map((d) => ({ value: d, label: d })), "Department")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Location</Label>
                <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{selectLabel(locationOptions, "Location")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="np-bio" className="mb-1.5">
                Bio
              </Label>
              <Textarea
                id="np-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short introduction — role, focus areas, background."
              />
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Interests & hobbies</h3>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest) => {
                  const active = interestIds.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Badge variant={active ? "default" : "secondary"} className="cursor-pointer font-normal">
                        {interest.name}
                        {active && <X className="size-3" />}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Industry experience</h3>
              <div className="flex flex-wrap gap-1.5">
                {industries.map((industry) => {
                  const active = industryIds.includes(industry.id);
                  return (
                    <button
                      key={industry.id}
                      onClick={() => toggleIndustry(industry.id)}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Badge variant={active ? "default" : "secondary"} className="cursor-pointer font-normal">
                        {industry.name}
                        {active && <X className="size-3" />}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add person</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
