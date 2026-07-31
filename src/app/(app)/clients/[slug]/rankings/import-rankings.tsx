"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { importKeywordsCsvAction, importRankingsCsvAction, type ImportSummary } from "@/app/(app)/rankings/actions";

export function ImportRankingsButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"keywords" | "rankings">("keywords");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);
    setSummary(null);
    const text = await file.text();
    start(async () => {
      const res =
        mode === "keywords"
          ? await importKeywordsCsvAction(clientId, text)
          : await importRankingsCsvAction(clientId, text);
      if (res.ok) {
        setSummary(res.data);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Import CSV
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-[var(--radius)] border border-border bg-card p-6 shadow-lg">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">Import SEO data</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload a CSV file. Existing records are updated; new ones are inserted.</p>

            <div className="mt-4 flex gap-2">
              <button
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${mode === "keywords" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                onClick={() => { setMode("keywords"); setSummary(null); }}
              >
                Keywords
              </button>
              <button
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${mode === "rankings" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                onClick={() => { setMode("rankings"); setSummary(null); }}
              >
                Ranking snapshots
              </button>
            </div>

            <div className="mt-4 rounded-md border border-dashed border-border p-6 text-center">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "keywords"
                  ? "Columns: keyword, search_volume, difficulty, cpc, country, city, device, url, is_brand, intent, group, baseline_position, current_position"
                  : "Columns: keyword, date, position, url, device, location"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button variant="outline" size="sm" className="mt-3" disabled={pending} onClick={() => fileRef.current?.click()}>
                {pending ? "Processing…" : "Choose CSV file"}
              </Button>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            {summary && (
              <div className="mt-3 rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" /> Import complete
                </p>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Inserted: <b className="text-foreground">{summary.inserted}</b></span>
                  <span>Updated: <b className="text-foreground">{summary.updated}</b></span>
                  <span>Skipped: <b className="text-foreground">{summary.skipped}</b></span>
                </div>
                {summary.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">{summary.errors.length} warning(s)</summary>
                    <ul className="mt-1 max-h-24 list-inside list-disc overflow-y-auto text-[11px] text-muted-foreground">
                      {summary.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
