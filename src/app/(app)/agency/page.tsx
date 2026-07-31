import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  AlertTriangle,
  ListChecks,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Plug,
  CheckCircle2,
  TimerReset,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Badge, PageHeader, Button, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { TrendChart, BarSeries, DonutChart } from "@/components/charts";
import {
  TASK_STATUS_LABELS,
  contractTone,
} from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { SystemRole, TaskStatus } from "@/generated/prisma/enums";
import { InsightsPanel } from "@/components/insights-panel";
import { generateTeamInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function AgencyOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Executives and interns get redirected to their tasks; agency overview is manager+.
  if (user.role === SystemRole.SEO_EXECUTIVE || user.role === SystemRole.INTERN || user.role === SystemRole.CLIENT_VIEWER) {
    redirect("/tasks");
  }

  const clientFilter = await getClientFilter(user);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    clients,
    overdueTasks,
    tasksDoneThisMonth,
    pendingReports,
    deliveredReports,
    pendingWorkLogs,
    disconnectedIntegrations,
    activeAlerts,
    approvedMinutes,
    recentActivity,
    taskStatusData,
  ] = await Promise.all([
    prisma.client.findMany({
      where: clientFilter,
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true, keywords: true } } },
    }),
    prisma.task.count({
      where: { client: clientFilter, status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] }, dueDate: { lt: now }, deletedAt: null },
    }),
    prisma.task.count({
      where: { client: clientFilter, status: TaskStatus.DONE, completedAt: { gte: monthStart }, deletedAt: null },
    }),
    prisma.report.count({ where: { client: clientFilter, status: { in: ["DRAFT", "IN_REVIEW"] } } }),
    prisma.report.count({ where: { client: clientFilter, status: "DELIVERED" } }),
    prisma.workLog.count({ where: { client: clientFilter, approvalStatus: "PENDING" } }),
    prisma.clientIntegration.count({ where: { client: clientFilter, status: { in: ["ERROR", "DISCONNECTED", "EXPIRED"] } } }),
    prisma.alertEvent.findMany({ where: { client: clientFilter, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.workLogItem.aggregate({
      where: { workLog: { client: clientFilter, approvalStatus: "APPROVED" } },
      _sum: { minutesSpent: true },
    }),
    prisma.workLog.findMany({
      where: { client: clientFilter },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { items: true, employee: { include: { user: true } }, client: true },
    }),
    monthonthlyStatusCounts(clientFilter),
  ]);

  // Monthly task completion (last 6 months)
  const monthlyTaskData = await buildMonthlyTaskData(clientFilter);

  // Client performance comparison (organic clicks last 28d)
  const since28 = new Date(now.getTime() - 28 * 86400000);
  const clientClicks = await prisma.searchConsoleSnapshot.groupBy({
    by: ["clientId"],
    where: { client: clientFilter, date: { gte: since28 } },
    _sum: { clicks: true },
    orderBy: { _sum: { clicks: "desc" } },
    take: 8,
  });
  const clientPerf = clientClicks
    .map((c) => {
      const cl = clients.find((x) => x.id === c.clientId);
      return cl ? { label: cl.name, clicks: c._sum.clicks ?? 0 } : null;
    })
    .filter(Boolean) as { label: string; clicks: number }[];

  const clientsNeedingAttention = clients.filter((c) => c.contractStatus !== "ACTIVE");

  // AI team insights
  const teamInsights = await generateTeamInsights(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Agency-wide SEO operations overview."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/clients">View all clients</Link>
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active Clients" value={clients.filter((c) => c.contractStatus === "ACTIVE").length} icon={<Building2 className="h-4 w-4" />} tone="primary" hint={`${clientsNeedingAttention.length} need attention`} />
        <StatCard label="Tasks Done (Month)" value={tasksDoneThisMonth} icon={<ListChecks className="h-4 w-4" />} tone="success" />
        <StatCard label="Overdue Tasks" value={overdueTasks} icon={<AlertTriangle className="h-4 w-4" />} tone={overdueTasks > 0 ? "danger" : "neutral"} />
        <StatCard label="Reports Pending" value={pendingReports} icon={<FileText className="h-4 w-4" />} tone={pendingReports > 0 ? "warning" : "neutral"} hint={`${deliveredReports} delivered`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Work Logs Awaiting Approval" value={pendingWorkLogs} icon={<Clock className="h-4 w-4" />} tone={pendingWorkLogs > 0 ? "warning" : "neutral"} />
        <StatCard label="Approved Hours Logged" value={`${Math.round((approvedMinutes._sum.minutesSpent ?? 0) / 60)}h`} icon={<TimerReset className="h-4 w-4" />} tone="neutral" />
        <StatCard label="Integration Issues" value={disconnectedIntegrations} icon={<Plug className="h-4 w-4" />} tone={disconnectedIntegrations > 0 ? "danger" : "neutral"} />
        <StatCard label="Active Alerts" value={activeAlerts.length} icon={<Activity className="h-4 w-4" />} tone={activeAlerts.length > 0 ? "warning" : "neutral"} />
      </div>

      {/* AI Insights */}
      <InsightsPanel headline={teamInsights.headline} insights={teamInsights.insights} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <BarSeries
              data={monthlyTaskData}
              series={[{ key: "completed", label: "Completed", color: "#16a34a" }, { key: "created", label: "Created", color: "#2563eb" }]}
              emptyLabel="No task history yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={taskStatusData} emptyLabel="No tasks." />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organic Clicks by Client (Last 28 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarSeries
              data={clientPerf}
              series={[{ key: "clicks", label: "Clicks" }]}
              layout="vertical"
              emptyLabel="No Search Console data. Connect GSC or import via CSV."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Alert Feed</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/alerts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No active alerts. All clear.</p>
            ) : (
              activeAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-2 rounded-md border border-border p-2.5">
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.severity === "CRITICAL" ? "text-danger" : a.severity === "WARNING" ? "text-warning" : "text-info"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{a.message}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(a.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + client health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Team Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" description="Work logs will appear here as your team submits them." />
            ) : (
              recentActivity.map((wl) => (
                <div key={wl.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {wl.employee?.user?.name?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{wl.employee?.user?.name}</span>{" "}
                      <span className="text-muted-foreground">logged work on</span>{" "}
                      <Link href={`/clients/${wl.client.slug}`} className="font-medium text-primary hover:underline">{wl.client.name}</Link>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {wl.items[0]?.workCompleted?.slice(0, 90) ?? "—"}
                    </p>
                  </div>
                  <Badge tone={wl.approvalStatus === "APPROVED" ? "success" : wl.approvalStatus === "PENDING" ? "warning" : "neutral"}>
                    {wl.approvalStatus.charAt(0) + wl.approvalStatus.slice(1).toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Client Health Summary</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/clients">All clients</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {clients.length === 0 ? (
              <EmptyState title="No clients yet" description="Create your first client to get started." action={<Button asChild size="sm"><Link href="/clients/new">Add client</Link></Button>} />
            ) : (
              clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.slug}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.primaryDomain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={contractTone(c.contractStatus)}>{c.contractStatus}</Badge>
                    <span className="text-xs text-muted-foreground">{c._count.tasks} tasks</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper: monthly task completion last 6 months
async function buildMonthlyTaskData(clientFilter: object) {
  const now = new Date();
  const months: { label: string; completed: number; created: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [done, created] = await Promise.all([
      prisma.task.count({ where: { client: clientFilter as any, status: "DONE", completedAt: { gte: start, lte: end } } }),
      prisma.task.count({ where: { client: clientFilter as any, createdAt: { gte: start, lte: end } } }),
    ]);
    months.push({ label: start.toLocaleString("en-US", { month: "short" }), completed: done, created });
  }
  return months;
}

async function monthonthlyStatusCounts(clientFilter: object) {
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: { client: clientFilter as any, deletedAt: null },
    _count: { status: true },
  });
  return grouped.map((g) => ({ name: TASK_STATUS_LABELS[g.status as TaskStatus] ?? g.status, value: g._count.status }));
}
