import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";
import { BarSeries } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { formatMinutes } from "@/lib/utils";
import { TASK_CATEGORY_LABELS } from "@/lib/constants";
import { TaskStatus } from "@/generated/prisma/enums";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface PerfRow {
  employeeId: string;
  name: string;
  role: string;
  assigned: number;
  completed: number;
  overdue: number;
  onTimeRate: number | null;
  complexityPoints: number;
  approvedMinutes: number;
  reworkCount: number;
  pendingApprovals: number;
}

export default async function TeamPerformancePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const filter = await getClientFilter(user);
  const now = new Date();

  const employees = await prisma.employee.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const rows: PerfRow[] = [];
  for (const emp of employees) {
    // Only count tasks for clients the viewer can see
    const [assigned, completed, overdue, doneWithDue, complexityAgg, minutesAgg, reworkAgg, pending] = await Promise.all([
      prisma.task.count({ where: { assigneeEmployeeId: emp.id, deletedAt: null, client: filter } }),
      prisma.task.count({ where: { assigneeEmployeeId: emp.id, status: TaskStatus.DONE, deletedAt: null, client: filter } }),
      prisma.task.count({ where: { assigneeEmployeeId: emp.id, status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] }, dueDate: { lt: now }, deletedAt: null, client: filter } }),
      prisma.task.findMany({ where: { assigneeEmployeeId: emp.id, status: TaskStatus.DONE, deletedAt: null, client: filter, dueDate: { not: null } }, select: { dueDate: true, completedAt: true } }),
      prisma.task.aggregate({ where: { assigneeEmployeeId: emp.id, status: TaskStatus.DONE, deletedAt: null, client: filter }, _sum: { complexityPoints: true } }),
      prisma.workLogItem.aggregate({ where: { workLog: { employeeId: emp.id, approvalStatus: "APPROVED", client: filter } }, _sum: { minutesSpent: true } }),
      prisma.task.aggregate({ where: { assigneeEmployeeId: emp.id, deletedAt: null, client: filter }, _sum: { reworkCount: true } }),
      prisma.workLog.count({ where: { employeeId: emp.id, approvalStatus: "PENDING", client: filter } }),
    ]);

    const onTime = doneWithDue.filter((t) => t.completedAt && t.dueDate && t.completedAt <= t.dueDate).length;
    const onTimeRate = doneWithDue.length > 0 ? Math.round((onTime / doneWithDue.length) * 100) : null;

    rows.push({
      employeeId: emp.id,
      name: emp.user.name,
      role: emp.user.role,
      assigned,
      completed,
      overdue,
      onTimeRate,
      complexityPoints: complexityAgg._sum.complexityPoints ?? 0,
      approvedMinutes: minutesAgg._sum.minutesSpent ?? 0,
      reworkCount: reworkAgg._sum.reworkCount ?? 0,
      pendingApprovals: pending,
    });
  }

  // Work-by-category across team (for the chart)
  const allItems = await prisma.workLogItem.findMany({
    where: { workLog: { client: filter, approvalStatus: "APPROVED" } },
    select: { category: true, minutesSpent: true },
  });
  const catMap = new Map<string, number>();
  for (const it of allItems) catMap.set(it.category, (catMap.get(it.category) ?? 0) + it.minutesSpent);
  const categoryData = [...catMap.entries()]
    .map(([category, minutes]) => ({ label: TASK_CATEGORY_LABELS[category as keyof typeof TASK_CATEGORY_LABELS] ?? category, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);

  const columns: Column<PerfRow>[] = [
    { key: "name", header: "Team member", cell: (r) => (
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{r.name[0]}</span>
        <span className="font-medium">{r.name}</span>
      </div>
    )},
    { key: "assigned", header: "Assigned", align: "right", cell: (r) => <span>{r.assigned}</span> },
    { key: "completed", header: "Completed", align: "right", cell: (r) => <span className="font-medium text-success">{r.completed}</span> },
    { key: "overdue", header: "Overdue", align: "right", cell: (r) => <span className={r.overdue > 0 ? "font-medium text-danger" : ""}>{r.overdue}</span> },
    { key: "onTime", header: "On-time %", align: "right", cell: (r) => <span>{r.onTimeRate != null ? `${r.onTimeRate}%` : "—"}</span> },
    { key: "complexity", header: "Complexity", align: "right", cell: (r) => <span>{r.complexityPoints}</span> },
    { key: "rework", header: "Reworks", align: "right", cell: (r) => <span className={r.reworkCount > 0 ? "text-warning" : ""}>{r.reworkCount}</span> },
    { key: "pending", header: "Pending logs", align: "right", cell: (r) => <span className={r.pendingApprovals > 0 ? "text-warning" : ""}>{r.pendingApprovals}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Team Performance" description="Completion, timeliness, complexity and rework — not just hours." />

      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          Performance here combines <b>completion</b>, <b>on-time rate</b>, <b>complexity points</b> and <b>rework count</b>. Hours are shown for capacity context only and are not the primary metric, per policy.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No team members" description="Active SEO staff will appear here." />
      ) : (
        <>
          {/* Per-person overview cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((r) => (
              <Card key={r.employeeId} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-white">{r.name[0]}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <Badge tone={r.role === "INTERN" ? "warning" : "primary"} className="mt-0.5">{r.role === "INTERN" ? "Intern" : r.role === "SEO_MANAGER" ? "Manager" : "Executive"}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div><p className="text-lg font-semibold text-success">{r.completed}</p><p className="text-[10px] text-muted-foreground">Completed</p></div>
                  <div><p className="text-lg font-semibold">{r.assigned}</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                  <div><p className={`text-lg font-semibold ${r.overdue > 0 ? "text-danger" : ""}`}>{r.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div>
                  <div><p className="text-lg font-semibold">{r.complexityPoints}</p><p className="text-[10px] text-muted-foreground">Complexity</p></div>
                </div>
                {r.onTimeRate != null && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">On-time: <b className={r.onTimeRate >= 80 ? "text-success" : "text-warning"}>{r.onTimeRate}%</b></p>
                )}
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Approved time by category (team-wide)</CardTitle></CardHeader>
            <CardContent>
              <BarSeries data={categoryData} series={[{ key: "minutes", label: "Minutes" }]} layout="vertical" height={Math.max(180, categoryData.length * 32)} emptyLabel="No approved work yet." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Performance summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable columns={columns} rows={rows} rowKey={(r) => r.employeeId} empty="No data." />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
