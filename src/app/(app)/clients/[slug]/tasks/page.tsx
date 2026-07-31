import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClient } from "@/lib/queries";
import { getClientFilter } from "@/lib/auth/scoping";
import { listTasks } from "@/lib/queries/tasks";
import { prisma } from "@/lib/db";
import { PageHeader, Button, EmptyState } from "@/components/ui";
import { TaskFiltersBar } from "@/app/(app)/tasks/task-board";
import { TASK_CATEGORY_LABELS } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ClientTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;
  const sp = await searchParams;

  const tasks = await listTasks(user, {
    clientId: client.id,
    status: (sp.status as any) ?? "ALL",
    category: sp.category,
    assigneeId: sp.assignee,
    search: sp.q,
  });

  const staff = await prisma.employee.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: { user: { select: { id: true, name: true } } },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description={`${tasks.length} task${tasks.length === 1 ? "" : "s"} for ${client.name}.`}
        actions={
          hasPermission(user.role, PERMISSIONS.CREATE_TASK) && (
            <Button asChild size="sm">
              <Link href={`/tasks/new?client=${client.id}`}><Plus className="h-4 w-4" /> New task</Link>
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
          clientName: client.name,
          clientSlug: client.slug,
          assigneeName: t.assignee?.name ?? null,
          complexityPoints: t.complexityPoints,
          approvalStatus: t.approvalStatus,
        }))}
        clients={[{ id: client.id, name: client.name, slug: client.slug }]}
        staff={staff.map((s) => ({ id: s.user.id, name: s.user.name }))}
        categories={Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        initialStatus={sp.status ?? "ALL"}
        canUpdate={hasPermission(user.role, PERMISSIONS.UPDATE_TASK)}
      />

      {tasks.length === 0 && (
        <EmptyState
          title="No tasks for this client yet"
          description="Create SEO-specific tasks and track them from backhand to done."
          action={hasPermission(user.role, PERMISSIONS.CREATE_TASK) ? <Button asChild size="sm"><Link href={`/tasks/new?client=${client.id}`}>New task</Link></Button> : undefined}
        />
      )}
    </div>
  );
}
