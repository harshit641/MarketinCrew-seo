import Link from "next/link";
import { Plus, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { listWorkLogs } from "@/lib/queries/worklogs";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Button, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { DataTable, type Column } from "@/components/data-table";
import {
  APPROVAL_STATUS_LABELS,
  TASK_CATEGORY_LABELS,
  approvalTone,
} from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { formatMinutes } from "@/lib/utils";
import { ApprovalActions } from "./approval-actions";
import { SystemRole } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function WorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;

  const isManager = user.role === SystemRole.SUPER_ADMIN || user.role === SystemRole.SEO_MANAGER;
  const canSubmit = hasPermission(user.role, PERMISSIONS.SUBMIT_WORKLOG);

  // Approval queue for managers
  const pending = isManager
    ? await listWorkLogs(user, { approvalStatus: "PENDING" })
    : [];

  const allLogs = await listWorkLogs(user, {
    clientId: sp.client,
    approvalStatus: sp.status && sp.status !== "ALL" ? sp.status : undefined,
    from: sp.from,
    to: sp.to,
  });

  const clients = await prisma.client.findMany({
    where: await getClientFilter(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const totalApproved = allLogs.filter((l) => l.approvalStatus === "APPROVED").length;
  const totalHours = allLogs
    .filter((l) => l.approvalStatus === "APPROVED")
    .reduce((s, l) => s + l.totalMinutes, 0);

  const columns: Column<(typeof allLogs)[number]>[] = [
    {
      key: "date",
      header: "Date",
      cell: (l) => <span className="text-sm">{fmtDate(l.date)}</span>,
    },
    {
      key: "employee",
      header: "Team member",
      cell: (l) => (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
            {l.employee?.user?.name?.[0] ?? "?"}
          </span>
          <span className="text-sm">{l.employee?.user?.name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (l) => <Link href={`/clients/${l.client.slug}`} className="text-sm hover:underline">{l.client.name}</Link>,
    },
    {
      key: "summary",
      header: "Activities",
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{l.items[0]?.workCompleted.slice(0, 70) ?? "—"}</p>
          {l.items.length > 1 && <span className="text-xs text-muted-foreground">+{l.items.length - 1} more</span>}
        </div>
      ),
    },
    {
      key: "categories",
      header: "Categories",
      cell: (l) => (
        <div className="flex flex-wrap gap-1">
          {[...new Set(l.items.map((i) => i.category))].slice(0, 2).map((c) => (
            <Badge key={c} tone="neutral">{TASK_CATEGORY_LABELS[c as keyof typeof TASK_CATEGORY_LABELS] ?? c}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "time",
      header: "Time",
      align: "right",
      cell: (l) => <span className="text-sm">{formatMinutes(l.totalMinutes)}</span>,
    },
    {
      key: "approval",
      header: "Approval",
      cell: (l) => <Badge tone={approvalTone(l.approvalStatus)}>{APPROVAL_STATUS_LABELS[l.approvalStatus]}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Work Logs"
        description="Submit and review the SEO team's daily activity."
        actions={
          canSubmit && (
            <Button asChild size="sm">
              <Link href="/work-logs/new"><Plus className="h-4 w-4" /> New daily log</Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending Approval" value={pending.length} icon={<Clock className="h-4 w-4" />} tone={pending.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Approved (period)" value={totalApproved} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Approved Hours" value={`${Math.round(totalHours / 60)}h`} icon={<ClipboardList className="h-4 w-4" />} tone="neutral" />
        <StatCard label="Total Logs (period)" value={allLogs.length} icon={<ClipboardList className="h-4 w-4" />} tone="primary" />
      </div>

      {isManager && pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((l) => (
              <div key={l.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{l.employee?.user?.name}</span>
                      <Link href={`/clients/${l.client.slug}`} className="text-sm text-primary hover:underline">{l.client.name}</Link>
                      <span className="text-xs text-muted-foreground">{fmtDate(l.date)}</span>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {l.items.map((it) => (
                        <li key={it.id} className="text-sm text-muted-foreground">
                          <Badge tone="neutral" className="mr-1.5">{TASK_CATEGORY_LABELS[it.category]}</Badge>
                          {it.workCompleted.slice(0, 90)}{it.workCompleted.length > 90 ? "…" : ""} · {formatMinutes(it.minutesSpent)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ApprovalActions workLogId={l.id} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>All Work Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {allLogs.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No work logs yet"
              description={canSubmit ? "Submit your first daily work log to start tracking activity." : "Work logs will appear here once the team submits them."}
              action={canSubmit ? <Button asChild size="sm"><Link href="/work-logs/new">New daily log</Link></Button> : undefined}
            />
          ) : (
            <DataTable columns={columns} rows={allLogs} rowKey={(l) => l.id} empty="No logs match these filters." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
