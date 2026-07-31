"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui";

const AHREFS_BACKLINKS_TEMPLATE = `#Referring page URL,Domain rating,URL rating,First seen,Last seen,Link strength,Anchor text, surrounding text,Title,Type,Destination,Status,Industry
https://blog.example.com/roof-care,45,18,2026-05-01,2026-07-15,30,roof repair tips,roof repair tips,Roof Care Tips,DoFollow,https://client.com/roof-repair,Live,Home Services
https://news.example.com/home,68,40,2026-04-20,2026-07-14,80,best roofers,best roofers,Home Improvement,DoFollow,https://client.com/,Live,News
`;

export function AhrefsConnector({
  clientId,
  status,
  connected,
}: {
  clientId: string;
  status: string;
  connected: boolean;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground`}>
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Ahrefs</p>
            <p className="text-xs text-muted-foreground">
              {connected ? "Token saved" : "Not connected"} — {status}
            </p>
          </div>
        </div>
        <ImportAhrefsBacklinksButton clientId={clientId} />
      </div>
      <div className="mt-2 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How to use Ahrefs with this client:</p>
        <ol className="mt-1 list-inside list-decimal space-y-0.5">
          <li>In Ahrefs, open your client&apos;s domain → <b>Backlinks</b> or <b>Organic keywords</b>.</li>
          <li>Click <b>Export</b> → CSV.</li>
          <li>Upload that CSV here (or use the Rankings/Backlinks Import buttons).</li>
        </ol>
        <p className="mt-1.5">Live Ahrefs API sync (token-based) is available on paid Ahrefs plans — connect via the Integrations page.</p>
      </div>
    </div>
  );
}

export function ImportAhrefsBacklinksButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<{ inserted: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);
    setSummary(null);
    const text = await file.text();
    start(async () => {
      const { importAhrefsBacklinksAction } = await import("./data-entry");
      const res = await importAhrefsBacklinksAction(clientId, text);
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
        <Upload className="h-4 w-4" /> Import Ahrefs CSV
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-[var(--radius)] border border-border bg-card p-6 shadow-lg">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">Import from Ahrefs (CSV)</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload the CSV you exported from Ahrefs Backlinks or Organic Keywords. Columns are auto-detected.</p>
            <div className="mt-4 rounded-md border border-dashed border-border p-6 text-center">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">Drag your Ahrefs export here, or click to choose. Supports Ahrefs default columns.</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Button variant="outline" size="sm" className="mt-3" disabled={pending} onClick={() => fileRef.current?.click()}>
                {pending ? "Processing…" : "Choose Ahrefs CSV"}
              </Button>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {summary && (
              <div className="mt-3 rounded-md border border-success/20 bg-success/10 px-3 py-2 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Import complete</p>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Inserted: <b className="text-foreground">{summary.inserted}</b></span>
                  <span>Updated: <b className="text-foreground">{summary.updated}</b></span>
                  <span>Skipped: <b className="text-foreground">{summary.skipped}</b></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Keep the template referenced (used by the route below if extended)
void AHREFS_BACKLINKS_TEMPLATE;
