"use client";

import { useRef } from "react";
import { ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUploadField({
  label,
  value,
  onChange,
  shape = "square",
}: {
  label: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  shape?: "square" | "circle";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
  }

  return (
    <div>
      <Label className="mb-1.5">{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-16 shrink-0 items-center justify-center overflow-hidden border border-dashed border-border bg-secondary/50 text-muted-foreground",
            shape === "circle" ? "rounded-full" : "rounded-xl"
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-provided data URL, not an optimizable static asset
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImageUp className="size-5" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <ImageUp /> {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onChange(undefined)}>
              <X /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
