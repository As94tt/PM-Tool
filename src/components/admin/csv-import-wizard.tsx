"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectLabel } from "@/lib/select-utils";
import { guessMapping, validateRows, type ImportField, type ValidatedRow } from "@/lib/csv-import";
import { cn } from "@/lib/utils";

type Step = "upload" | "mapping" | "review" | "done";

export function CsvImportWizard({
  entityLabel,
  fields,
  sampleUrl,
  onImport,
}: {
  entityLabel: string;
  fields: ImportField[];
  sampleUrl: string;
  onImport: (rows: Record<string, string>[]) => number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedHeaders = results.meta.fields ?? [];
        if (parsedHeaders.length === 0 || results.data.length === 0) {
          toast.error("Couldn't read any rows from that file");
          return;
        }
        setFileName(file.name);
        setHeaders(parsedHeaders);
        setRows(results.data);
        setMapping(guessMapping(parsedHeaders, fields));
        setStep("mapping");
      },
      error: () => toast.error("Failed to parse CSV file"),
    });
  }

  const validated: ValidatedRow[] = rows.length ? validateRows(rows, mapping, fields) : [];
  const validCount = validated.filter((r) => r.errors.length === 0).length;
  const invalidCount = validated.length - validCount;

  function handleImport() {
    const validRows = validated.filter((r) => r.errors.length === 0).map((r) => r.data);
    const count = onImport(validRows);
    setImportedCount(count);
    setStep("done");
  }

  const headerOptions = [{ value: "none", label: "Don't import" }, ...headers.map((h) => ({ value: h, label: h }))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        {(["upload", "mapping", "review", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : (["upload", "mapping", "review", "done"] as Step[]).indexOf(step) > i
                    ? "bg-status-healthy/20 text-status-healthy"
                    : "bg-secondary text-muted-foreground"
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-xs capitalize", step === s ? "font-medium text-foreground" : "text-muted-foreground")}>
              {s}
            </span>
            {i < 3 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
          <Upload className="size-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Upload a CSV of {entityLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated, first row should be column headers.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload /> Choose file
          </Button>
          <a href={sampleUrl} download className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="size-3.5" /> Download a sample CSV
          </a>
        </div>
      )}

      {step === "mapping" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{fileName}</span> · {rows.length} rows · map each column below
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              const opts = headerOptions;
              return (
                <div key={field.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="w-36 shrink-0 truncate text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </span>
                  <Select
                    value={mapping[field.key] || "none"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v && v !== "none" ? v : "" }))}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <SelectValue>{selectLabel(opts, "Don't import")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={() => setStep("review")}>Continue</Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-status-healthy">
              <CheckCircle2 className="size-4" /> {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-destructive">
                <CircleAlert className="size-4" /> {invalidCount} with errors (will be skipped)
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                  {fields.map((f) => (
                    <th key={f.key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {validated.map((row) => (
                  <tr key={row.rowIndex} className="border-t border-border/70">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.rowIndex + 1}</td>
                    {fields.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-xs">
                        {row.data[f.key] || <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {row.errors.length === 0 ? (
                        <Badge variant="secondary" className="bg-status-healthy/15 text-status-healthy">
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-destructive/15 text-destructive" title={row.errors.join(", ")}>
                          {row.errors[0]}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={validCount === 0}>
              Import {validCount} {entityLabel}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-14 text-center">
          <CheckCircle2 className="size-10 text-status-healthy" />
          <div>
            <p className="font-heading text-lg font-semibold">Import complete</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {importedCount} {entityLabel} imported successfully.
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            <RotateCcw /> Import another file
          </Button>
        </div>
      )}
    </div>
  );
}
