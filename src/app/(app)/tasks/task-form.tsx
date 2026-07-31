"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createTaskAction } from "./actions";
import { TASK_CATEGORY_LABELS, TASK_PRIORITY_LABELS } from "@/lib/constants";
import type { TaskCategory, TaskPriority, TaskStatus } from "@/generated/prisma/enums";

export function TaskForm({
  clients,
  staff,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTaskAction, undefined);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.push("/tasks");
      router.refresh();
    }
  }, [state, router]);

  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client *" className="sm:col-span-2">
          <Select name="clientId" defaultValue={defaultClientId} required>
            <option value="">Select a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Title *" className="sm:col-span-2">
          <Input name="title" placeholder="e.g. Optimize homepage title tag" required />
        </Field>
        <Field label="Category">
          <Select name="category">
            {Object.entries(TASK_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue="MEDIUM">
            {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Assignee">
          <Select name="assigneeId">
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="TODO">
            {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] as TaskStatus[]).map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start date">
          <Input name="startDate" type="date" />
        </Field>
        <Field label="Due date">
          <Input name="dueDate" type="date" />
        </Field>
        <Field label="Estimated minutes">
          <Input name="estimatedMinutes" type="number" min={0} step={15} />
        </Field>
        <Field label="Complexity points" hint="1 (trivial) to 8 (complex)">
          <Input name="complexityPoints" type="number" min={1} max={8} defaultValue={1} />
        </Field>
        <Field label="Related URL">
          <Input name="relatedUrl" type="url" placeholder="https://…" />
        </Field>
        <Field label="Related keyword">
          <Input name="relatedKeyword" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea name="description" rows={4} />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create task"}</Button>
      </div>
    </form>
  );
}

// Keep types referenced for clarity
export type { TaskCategory, TaskPriority };
