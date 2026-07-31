"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  List as ListIcon,
  Search,
} from "lucide-react";
import { Button, Badge, Select } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import {
  TASK_STATUS_LABELS,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  taskStatusTone,
} from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction } from "./actions";
import type { TaskStatus, TaskPriority, TaskCategory, ApprovalStatus } from "@/generated/prisma/enums";

export interface BoardTask {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  clientId: string;
  clientName: string;
  clientSlug: string;
  assigneeName: string | null;
  complexityPoints: number;
  approvalStatus: ApprovalStatus;
}

const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "BACKLOG", label: "Backlog" },
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "IN_REVIEW", label: "In Review" },
  { status: "AWAITING_APPROVAL", label: "Awaiting Approval" },
  { status: "DONE", label: "Done" },
];

export function TaskFiltersBar({
  tasks,
  clients,
  staff,
  categories,
  initialStatus,
  canUpdate,
}: {
  tasks: BoardTask[];
  clients: { id: string; name: string; slug: string }[];
  staff: { id: string; name: string }[];
  categories: { value: string; label: string }[];
  initialStatus: string;
  canUpdate: boolean;
}) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="flex h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Search tasks…"
            defaultValue={sp.get("q") ?? ""}
            onChange={(e) => updateParam("q", e.target.value)}
          />
        </div>
        <Select defaultValue={sp.get("client") ?? "ALL"} onChange={(e) => updateParam("client", e.target.value)} className="w-auto min-w-[150px]">
          <option value="ALL">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select defaultValue={sp.get("assignee") ?? "ALL"} onChange={(e) => updateParam("assignee", e.target.value)} className="w-auto min-w-[150px]">
          <option value="ALL">All assignees</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select defaultValue={sp.get("category") ?? "ALL"} onChange={(e) => updateParam("category", e.target.value)} className="w-auto min-w-[160px]">
          <option value="ALL">All categories</option>
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Select defaultValue={initialStatus} onChange={(e) => updateParam("status", e.target.value)} className="w-auto min-w-[160px]">
          <option value="ALL">All statuses</option>
          <option value="OVERDUE">Overdue</option>
          <option value="AWAITING_APPROVAL">Awaiting approval</option>
          {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>

        <div className="ml-auto flex items-center rounded-md border border-border bg-card p-0.5">
          <button
            className={cn("flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            onClick={() => setView("list")}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </button>
          <button
            className={cn("flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium", view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
      </div>

      {view === "list" ? (
        <TaskListView tasks={tasks} canUpdate={canUpdate} />
      ) : (
        <TaskKanbanView tasks={tasks} canUpdate={canUpdate} />
      )}
    </div>
  );
}

function TaskListView({ tasks, canUpdate }: { tasks: BoardTask[]; canUpdate: boolean }) {
  const columns: Column<BoardTask>[] = [
    {
      key: "title",
      header: "Task",
      cell: (t) => (
        <div className="min-w-0">
          <Link href={`/clients/${t.clientSlug}/tasks#${t.id}`} className="font-medium hover:underline">
            {t.title}
          </Link>
          <p className="text-xs text-muted-foreground">{TASK_CATEGORY_LABELS[t.category]}</p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (t) => <Link href={`/clients/${t.clientSlug}`} className="text-sm hover:underline">{t.clientName}</Link>,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) =>
        canUpdate ? <StatusSelect task={t} /> : <Badge tone={taskStatusTone(t.status)}>{TASK_STATUS_LABELS[t.status]}</Badge>,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (t) => <span className={cn("text-sm", t.priority === "URGENT" && "font-semibold text-danger", t.priority === "HIGH" && "font-medium text-warning")}>{TASK_PRIORITY_LABELS[t.priority]}</span>,
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: (t) => <span className="text-sm text-muted-foreground">{t.assigneeName ?? "—"}</span>,
    },
    {
      key: "due",
      header: "Due",
      align: "right",
      cell: (t) => {
        if (!t.dueDate) return <span className="text-muted-foreground">—</span>;
        const overdue = new Date(t.dueDate) < new Date() && t.status !== "DONE";
        return <span className={cn("text-sm", overdue && "font-medium text-danger")}>{fmtDate(t.dueDate)}</span>;
      },
    },
  ];

  return <DataTable columns={columns} rows={tasks} rowKey={(t) => t.id} empty="No tasks match these filters." />;
}

function TaskKanbanView({ tasks, canUpdate }: { tasks: BoardTask[]; canUpdate: boolean }) {
  return (
    <div className="scrollbar-thin grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="flex min-w-[220px] flex-col rounded-[var(--radius)] border border-border bg-muted/30">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
              <Badge tone="neutral">{colTasks.length}</Badge>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {colTasks.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">Empty</p>}
              {colTasks.map((t) => (
                <div key={t.id} className="rounded-md border border-border bg-card p-2.5 shadow-sm">
                  <Link href={`/clients/${t.clientSlug}/tasks#${t.id}`} className="block text-sm font-medium hover:underline">
                    {t.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.clientName} · {TASK_CATEGORY_LABELS[t.category]}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tone={taskStatusTone(t.status)}>{TASK_STATUS_LABELS[t.status]}</Badge>
                    {t.dueDate && (
                      <span className={cn("text-[11px]", new Date(t.dueDate) < new Date() && t.status !== "DONE" && "text-danger")}>
                        {fmtDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                  {canUpdate && <KanbanStatusMover task={t} />}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusSelect({ task }: { task: BoardTask }) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={task.status}
      disabled={pending}
      onChange={(e) => start(async () => { await updateTaskStatusAction(task.id, e.target.value as TaskStatus); })}
      className="h-7 rounded border border-border bg-card px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function KanbanStatusMover({ task }: { task: BoardTask }) {
  const [pending, start] = useTransition();
  const idx = KANBAN_COLUMNS.findIndex((c) => c.status === task.status);
  return (
    <div className="mt-2 flex gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[11px]"
        disabled={pending || idx <= 0}
        onClick={() => start(async () => { await updateTaskStatusAction(task.id, KANBAN_COLUMNS[idx - 1].status); })}
      >
        ←
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[11px]"
        disabled={pending || idx >= KANBAN_COLUMNS.length - 1}
        onClick={() => start(async () => { await updateTaskStatusAction(task.id, KANBAN_COLUMNS[idx + 1].status); })}
      >
        →
      </Button>
    </div>
  );
}
