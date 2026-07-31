import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Button, Badge, EmptyState, Card, CardContent } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { REPORT_STATUS_LABELS } from "@/lib/constants";
import { fmtDate, fmtRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const filter = await getClientFilter(user);
  const reports = await prisma.report.findMany({
    where: { client: filter },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, slug: true } }, createdBy: { select: { name: true } } },
  });

  const columns: Column<(typeof reports)[number]>[] = [
    { key: "title", header: "Report", cell: (r) => <Link href={`/reports/${r.id}`} className="font-medium hover:underline">{r.title}</Link> },
    { key: "client", header: "Client", cell: (r) => <Link href={`/clients/${r.client.slug}`} className="text-sm hover:underline">{r.client.name}</Link> },
    { key: "period", header: "Period", cell: (r) => <span className="text-sm text-muted-foreground">{fmtRange(r.periodStart, r.periodEnd)}</span> },
    { key: "type", header: "Type", cell: (r) => <Badge tone="neutral">{r.type}</Badge> },
    { key: "status", header: "Status", cell: (r) => <Badge tone={r.status === "DELIVERED" ? "success" : r.status === "APPROVED" ? "primary" : "warning"}>{REPORT_STATUS_LABELS[r.status]}</Badge> },
    { key: "created", header: "Created", cell: (r) => <span className="text-sm text-muted-foreground">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description={`${reports.length} report${reports.length === 1 ? "" : "s"}.`}
        actions={hasPermission(user.role, PERMISSIONS.CREATE_REPORT) && (
          <Button asChild size="sm"><Link href="/reports/new"><Plus className="h-4 w-4" /> New report</Link></Button>
        )}
      />

      {reports.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title="No reports yet" description="Build a professional monthly or custom-date SEO report." action={hasPermission(user.role, PERMISSIONS.CREATE_REPORT) ? <Button asChild size="sm"><Link href="/reports/new">New report</Link></Button> : undefined} />
      ) : (
        <Card><CardContent className="p-0"><DataTable columns={columns} rows={reports} rowKey={(r) => r.id} empty="No reports." /></CardContent></Card>
      )}
    </div>
  );
}
