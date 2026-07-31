import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, Badge, EmptyState } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDateTime } from "@/lib/dates";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: user.organizationId,
      ...(sp.action ? { action: { contains: sp.action } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true } } },
  });

  const columns: Column<(typeof logs)[number]>[] = [
    { key: "time", header: "Time", cell: (l) => <span className="text-sm text-muted-foreground">{fmtDateTime(l.createdAt)}</span> },
    { key: "actor", header: "User", cell: (l) => <span className="text-sm">{l.actor?.name ?? "System"}</span> },
    { key: "action", header: "Action", cell: (l) => <Badge tone="primary">{l.action}</Badge> },
    { key: "entity", header: "Entity", cell: (l) => <span className="text-sm">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(-6)}` : ""}</span> },
    { key: "ip", header: "IP", cell: (l) => <span className="text-xs text-muted-foreground">{l.ipAddress ?? "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" description="Append-only record of sensitive actions. Last 200 entries." />
      {logs.length === 0 ? (
        <EmptyState icon={<History className="h-8 w-8" />} title="No audit entries yet" description="Logins, approvals, imports and config changes are recorded here." />
      ) : (
        <Card><CardContent className="p-0"><DataTable columns={columns} rows={logs} rowKey={(l) => l.id} empty="No logs." /></CardContent></Card>
      )}
    </div>
  );
}
