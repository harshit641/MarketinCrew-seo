"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button, Field, Input, Select, Textarea, Badge } from "@/components/ui";
import { submitWorkLogAction } from "./actions";
import { TASK_CATEGORY_LABELS } from "@/lib/constants";
import type { TaskCategory, WorkLogStatus } from "@/generated/prisma/enums";

interface ItemRow {
  clientId: string; // per-item client — empty = use primary client
  taskId: string;
  category: TaskCategory;
  workCompleted: string;
  deliverable: string;
  urlWorkedOn: string;
  keywordWorkedOn: string;
  minutesSpent: number;
  status: WorkLogStatus;
  evidenceUrl: string;
  nextAction: string;
  clientVisibleSummary: string;
  billable: boolean;
}

function emptyRow(defaultClientId: string): ItemRow {
  return {
    clientId: defaultClientId,
    taskId: "",
    category: "ON_PAGE_SEO",
    workCompleted: "",
    deliverable: "",
    urlWorkedOn: "",
    keywordWorkedOn: "",
    minutesSpent: 30,
    status: "COMPLETED",
    evidenceUrl: "",
    nextAction: "",
    clientVisibleSummary: "",
    billable: true,
  };
}

export function WorkLogForm({
  clients,
  tasks,
  defaultClientId,
  employeeName,
}: {
  clients: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  defaultClientId?: string;
  employeeName: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<ItemRow[]>([emptyRow(defaultClientId ?? "")]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function updateRow(idx: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow(clientId)]);
  }
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalMinutes = rows.reduce((s, r) => s + (Number(r.minutesSpent) || 0), 0);
  // distinct clients touched in this daily log
  const clientsTouched = new Set(rows.map((r) => r.clientId || clientId).filter(Boolean));

  // Duplicate-entry warning: same client + same date already has a submission.
  // (Server is the source of truth; this is just a heads-up.)

  function submit(isDraft: boolean) {
    setError(null);
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    const valid = rows.filter((r) => r.workCompleted.trim().length >= 3);
    if (valid.length === 0) {
      setError("Add at least one activity with a description.");
      return;
    }

    start(async () => {
      const res = await submitWorkLogAction({
        clientId,
        date,
        isDraft,
        items: valid.map((r) => ({
          clientId: r.clientId || undefined,
          taskId: r.taskId || undefined,
          category: r.category,
          workCompleted: r.workCompleted,
          deliverable: r.deliverable || undefined,
          urlWorkedOn: r.urlWorkedOn || undefined,
          keywordWorkedOn: r.keywordWorkedOn || undefined,
          minutesSpent: Number(r.minutesSpent) || 0,
          status: r.status,
          evidenceUrl: r.evidenceUrl || undefined,
          nextAction: r.nextAction || undefined,
          clientVisibleSummary: r.clientVisibleSummary || undefined,
          billable: r.billable,
        })),
      });
      if (res.ok) {
        router.push("/work-logs");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 border-b border-border pb-4">
        <div className="flex-1">
          <Field label="Team member">
            <Input value={employeeName} disabled className="bg-muted" />
            <p className="text-[11px] text-muted-foreground">Auto-filled from your account. You cannot log work under another name.</p>
          </Field>
        </div>
        <div className="min-w-[200px] flex-1">
          <Field label="Client *">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Date *">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Activity rows */}
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-[var(--radius)] border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                Activity {idx + 1}
                <Badge tone="neutral">{TASK_CATEGORY_LABELS[row.category]}</Badge>
              </span>
              {rows.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="text-danger hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Client for this activity" hint="Pick which client this work belongs to.">
                <Select
                  value={row.clientId}
                  onChange={(e) => updateRow(idx, { clientId: e.target.value })}
                >
                  <option value="">Same as primary</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Category">
                <Select
                  value={row.category}
                  onChange={(e) => updateRow(idx, { category: e.target.value as TaskCategory })}
                >
                  {Object.entries(TASK_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Related task">
                <Select value={row.taskId} onChange={(e) => updateRow(idx, { taskId: e.target.value })}>
                  <option value="">No linked task</option>
                  {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </Select>
              </Field>
              <Field label="Time spent (min)">
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={row.minutesSpent}
                  onChange={(e) => updateRow(idx, { minutesSpent: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Work completed *" error={row.workCompleted && row.workCompleted.length < 3 ? "Too short" : undefined}>
                <Textarea
                  rows={2}
                  placeholder="Describe exactly what you did…"
                  value={row.workCompleted}
                  onChange={(e) => updateRow(idx, { workCompleted: e.target.value })}
                />
              </Field>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="URL worked on">
                <Input value={row.urlWorkedOn} onChange={(e) => updateRow(idx, { urlWorkedOn: e.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Keyword">
                <Input value={row.keywordWorkedOn} onChange={(e) => updateRow(idx, { keywordWorkedOn: e.target.value })} />
              </Field>
              <Field label="Evidence URL">
                <Input value={row.evidenceUrl} onChange={(e) => updateRow(idx, { evidenceUrl: e.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Deliverable / result">
                <Input value={row.deliverable} onChange={(e) => updateRow(idx, { deliverable: e.target.value })} />
              </Field>
              <Field label="Next action">
                <Input value={row.nextAction} onChange={(e) => updateRow(idx, { nextAction: e.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={row.status} onChange={(e) => updateRow(idx, { status: e.target.value as WorkLogStatus })}>
                  <option value="COMPLETED">Completed</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="AWAITING_APPROVAL">Awaiting approval</option>
                </Select>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Client-visible summary" hint="A clean version safe to share with the client.">
                <Textarea
                  rows={2}
                  value={row.clientVisibleSummary}
                  onChange={(e) => updateRow(idx, { clientVisibleSummary: e.target.value })}
                  placeholder="e.g. Optimized on-page SEO for the services page."
                />
              </Field>
            </div>

            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.billable}
                onChange={(e) => updateRow(idx, { billable: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Billable
            </label>
          </div>
        ))}

        <Button variant="outline" onClick={addRow} type="button">
          <Plus className="h-4 w-4" /> Add another activity
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          Total time: <span className="font-semibold text-foreground">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span> across {rows.length} activit{rows.length === 1 ? "y" : "ies"} · {clientsTouched.size} client{clientsTouched.size === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => submit(true)}>Save draft</Button>
          <Button disabled={pending} onClick={() => submit(false)}>{pending ? "Submitting…" : "Submit for approval"}</Button>
        </div>
      </div>
    </div>
  );
}
