import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { listTasks, type TaskFilters } from "@/lib/queries/tasks";
import { prisma } from "@/lib/db";
import { PageHeader, Button, EmptyState } from "@/components/ui";
import { TaskFiltersBar } from "./task-board";
import { TASK_CATEGORY_LABELS } from "@/lib/constants";
import { TaskStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;

  const filters: TaskFilters = {
    clientId: sp.client,
    assigneeId: sp.assignee,
    category: sp.category,
    status: (sp.status as TaskFilters["status"]) ?? "ALL",
    search: sp.q,
  };

  const [tasks, clients, staff] = await Promise.all([
    listTasks(user, filters),
    prisma.client.findMany({ where: await getClientFilter(user), select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const canCreate = hasPermission(user.role, PERMISSIONS.CREATE_TASK);
  const staffOptions = staff.map((s) => ({ id: s.user.id, name: s.user.name }));
  const categoryOptions = Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description={`${tasks.length} task${tasks.length === 1 ? "" : "s"} matching your filters.`}
        actions={
          canCreate && (
            <Button asChild size="sm">
              <Link href="/tasks/new"><Plus className="h-4 w-4" /> New task</Link>
            </Button>
          )
        }
      />

      <TaskFiltersBar
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          clientId: t.clientId,
          clientName: t.client.name,
          clientSlug: t.client.slug,
          assigneeName: t.assignee?.name ?? null,
          complexityPoints: t.complexityPoints,
          approvalStatus: t.approvalStatus,
        }))}
        clients={clients}
        staff={staffOptions}
        categories={categoryOptions}
        initialStatus={filters.status ?? "ALL"}
        canUpdate={hasPermission(user.role, PERMISSIONS.UPDATE_TASK)}
      />

      {tasks.length === 0 && (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="No tasks found"
          description="Adjust your filters, or create a new task to get started."
          action={canCreate ? <Button asChild size="sm"><Link href="/tasks/new">New task</Link></Button> : undefined}
        />
      )}
    </div>
  );
}
