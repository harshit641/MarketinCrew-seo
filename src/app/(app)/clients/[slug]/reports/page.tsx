import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Button, Badge, EmptyState, Card, CardContent } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { REPORT_STATUS_LABELS } from "@/lib/constants";
import { fmtDate, fmtRange } from "@/lib/dates";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ClientReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const filter = await getClientFilter(user);
  const reports = await prisma.report.findMany({
    where: { client: filter, clientId: client.id },
    orderBy: { periodStart: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const columns: Column<(typeof reports)[number]>[] = [
    { key: "title", header: "Report", cell: (r) => <Link href={`/reports/${r.id}`} className="font-medium hover:underline">{r.title}</Link> },
    { key: "period", header: "Period", cell: (r) => <span className="text-sm text-muted-foreground">{fmtRange(r.periodStart, r.periodEnd)}</span> },
    { key: "type", header: "Type", cell: (r) => <Badge tone="neutral">{r.type}</Badge> },
    { key: "status", header: "Status", cell: (r) => <Badge tone={r.status === "DELIVERED" ? "success" : r.status === "APPROVED" ? "primary" : "warning"}>{REPORT_STATUS_LABELS[r.status]}</Badge> },
    { key: "created", header: "Created", cell: (r) => <span className="text-sm text-muted-foreground">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description={`${reports.length} report${reports.length === 1 ? "" : "s"} for ${client.name}.`}
        actions={hasPermission(user.role, PERMISSIONS.CREATE_REPORT) && (
          <Button asChild size="sm"><Link href={`/reports/new?client=${client.id}`}><Plus className="h-4 w-4" /> New report</Link></Button>
        )}
      />

      {reports.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title="No reports yet" description="Generate a monthly or custom-date SEO report." action={hasPermission(user.role, PERMISSIONS.CREATE_REPORT) ? <Button asChild size="sm"><Link href={`/reports/new?client=${client.id}`}>New report</Link></Button> : undefined} />
      ) : (
        <Card><CardContent className="p-0"><DataTable columns={columns} rows={reports} rowKey={(r) => r.id} empty="No reports." /></CardContent></Card>
      )}
    </div>
  );
}
