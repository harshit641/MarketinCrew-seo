"use client";

import { useTransition, useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { Button, Textarea, Label } from "@/components/ui";
import { updateReportContentAction } from "../actions";

const FIELDS = [
  { key: "executiveSummary", label: "Executive Summary", hint: "High-level overview of the month. Appears at the top of the report." },
  { key: "keyWins", label: "Key Wins", hint: "The headline successes for the client." },
  { key: "issuesRisks", label: "Issues & Risks", hint: "Problems, drops or risks to flag." },
  { key: "recommendations", label: "Recommendations", hint: "Concrete next actions." },
  { key: "nextMonthPlan", label: "Next Month's Plan", hint: "What the team will focus on." },
] as const;

export function SectionCommentary({
  reportId,
  initial,
}: {
  reportId: string;
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    start(async () => {
      await updateReportContentAction(reportId, values);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}</Label>
          <Textarea
            rows={3}
            value={values[f.key] ?? ""}
            onChange={(e) => { setValues((v) => ({ ...v, [f.key]: e.target.value })); setSaved(false); }}
            placeholder={f.hint}
          />
          <p className="text-[11px] text-muted-foreground">{f.hint}</p>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : <><Save className="h-3.5 w-3.5" /> Save commentary</>}
        </Button>
        {saved && <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>}
      </div>
    </div>
  );
}
