import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, Badge, Button, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { fmtDateTime } from "@/lib/dates";
import { AlertStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const SEVERITY_TONE: Record<string, any> = { CRITICAL: "danger", WARNING: "warning", INFO: "info" };

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const filter = await getClientFilter(user);

  const [active, acknowledged, recent] = await Promise.all([
    prisma.alertEvent.findMany({ where: { client: filter, status: AlertStatus.ACTIVE }, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true, slug: true } } } }),
    prisma.alertEvent.count({ where: { client: filter, status: AlertStatus.ACKNOWLEDGED } }),
    prisma.alertEvent.count({ where: { client: filter, status: AlertStatus.RESOLVED } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts & Notifications" description="Configurable alerts for ranking, traffic, integrations and tasks." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Active" value={active.length} icon={<AlertTriangle className="h-4 w-4" />} tone={active.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Acknowledged" value={acknowledged} icon={<Bell className="h-4 w-4" />} tone="neutral" />
        <StatCard label="Resolved" value={recent} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
      </div>

      {active.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="All clear" description="No active alerts. The system monitors ranking drops, lost backlinks, integration failures and overdue tasks." />
      ) : (
        <div className="space-y-2">
          {active.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${a.severity === "CRITICAL" ? "text-danger" : a.severity === "WARNING" ? "text-warning" : "text-info"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                    <Badge tone="neutral">{a.category.replace(/_/g, " ")}</Badge>
                    {a.client && <Link href={`/clients/${a.client.slug}`} className="text-sm text-primary hover:underline">{a.client.name}</Link>}
                  </div>
                  <p className="mt-1 text-sm">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
