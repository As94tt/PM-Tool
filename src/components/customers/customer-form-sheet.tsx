"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { useAppStore } from "@/store/app-store-provider";
import { selectLabel } from "@/lib/select-utils";
import type { Client } from "@/lib/types";

export function CustomerFormSheet({ client }: { client?: Client }) {
  const router = useRouter();
  const isEdit = Boolean(client);
  const [open, setOpen] = useState(false);

  const industries = useAppStore((s) => s.industries);
  const addClient = useAppStore((s) => s.addClient);
  const updateClient = useAppStore((s) => s.updateClient);

  const [name, setName] = useState(client?.name ?? "");
  const [industryId, setIndustryId] = useState(client?.industryId ?? "");
  const [contactName, setContactName] = useState(client?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(client?.contactPhone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(client?.logoUrl);

  const industryOptions = [{ value: "none", label: "No industry set" }, ...industries.map((i) => ({ value: i.id, label: i.name }))];

  function reset() {
    setName("");
    setIndustryId("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setNotes("");
    setLogoUrl(undefined);
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (isEdit && client) {
      updateClient(client.id, {
        name: name.trim(),
        industryId: industryId || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        logoUrl,
      });
      toast.success("Customer updated");
      setOpen(false);
      return;
    }

    const id = `client-${Date.now()}`;
    addClient({
      id,
      name: name.trim(),
      industryId: industryId || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      logoUrl,
    });
    toast.success("Customer added");
    setOpen(false);
    reset();
    router.push(`/customers/${id}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size={isEdit ? "sm" : "default"} variant={isEdit ? "outline" : "default"} />}>
        {isEdit ? (
          "Edit customer"
        ) : (
          <>
            <Building2 /> New customer
          </>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{isEdit ? "Edit customer" : "New customer"}</SheetTitle>
          <SheetDescription>Contact details and branding for a client company.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100svh-10rem)]">
          <div className="flex flex-col gap-5 px-6 py-6">
            <ImageUploadField label="Company logo" value={logoUrl} onChange={setLogoUrl} shape="square" />

            <div>
              <Label htmlFor="c-name" className="mb-1.5">
                Company name
              </Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Meridian Automotive Group" />
            </div>

            <div>
              <Label className="mb-1.5">Industry</Label>
              <Select value={industryId || "none"} onValueChange={(v) => setIndustryId(v && v !== "none" ? v : "")}>
                <SelectTrigger className="w-full">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="c-contact" className="mb-1.5">
                  Contact name
                </Label>
                <Input id="c-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <Label htmlFor="c-email" className="mb-1.5">
                  Contact email
                </Label>
                <Input
                  id="c-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="jane.doe@client.example"
                />
              </div>
              <div>
                <Label htmlFor="c-phone" className="mb-1.5">
                  Contact phone
                </Label>
                <Input id="c-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+49 30 1234567" />
              </div>
            </div>

            <div>
              <Label htmlFor="c-notes" className="mb-1.5">
                Notes
              </Label>
              <Textarea
                id="c-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Relationship history, account context, anything worth knowing."
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEdit ? "Save changes" : "Add customer"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
