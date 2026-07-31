import Link from "next/link";
import { Wrench, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { IssueSeverity } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function TechnicalOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const filter = await getClientFilter(user);

  const [openCount, criticalCount, resolvedCount] = await Promise.all([
    prisma.technicalIssue.count({ where: { client: filter, status: "OPEN" } }),
    prisma.technicalIssue.count({ where: { client: filter, status: "OPEN", severity: { in: [IssueSeverity.CRITICAL, IssueSeverity.HIGH] } } }),
    prisma.technicalIssue.count({ where: { client: filter, status: "RESOLVED" } }),
  ]);

  const clients = await prisma.client.findMany({
    where: filter,
    select: { id: true, name: true, slug: true, technicalIssues: { where: { status: "OPEN" }, select: { severity: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Technical SEO" description="Audit issues and PageSpeed across all clients." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Open Issues" value={openCount} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
        <StatCard label="Critical / High (open)" value={criticalCount} icon={<AlertTriangle className="h-4 w-4" />} tone={criticalCount > 0 ? "danger" : "neutral"} />
        <StatCard label="Resolved" value={resolvedCount} icon={<Wrench className="h-4 w-4" />} tone="success" />
      </div>

      <Card>
        <CardContent className="space-y-2 pt-5">
          {clients.length === 0 ? (
            <EmptyState title="No clients" />
          ) : (
            clients.map((c) => {
              const open = c.technicalIssues.length;
              const crit = c.technicalIssues.filter((i) => i.severity === IssueSeverity.CRITICAL || i.severity === IssueSeverity.HIGH).length;
              return (
                <Link key={c.id} href={`/clients/${c.slug}/technical`} className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/40">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{open} open{crit > 0 && <span className="ml-1 text-danger">({crit} critical)</span>}</span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
