import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { PROVIDER_LABELS, INTEGRATION_STATUS_LABELS, integrationTone } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { Plug, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const filter = await getClientFilter(user);

  const integrations = await prisma.clientIntegration.findMany({
    where: { client: filter },
    orderBy: [{ clientId: "asc" }, { provider: "asc" }],
    include: { client: { select: { id: true, name: true, slug: true } } },
  });

  const columns: Column<(typeof integrations)[number]>[] = [
    { key: "client", header: "Client", cell: (i) => <Link href={`/clients/${i.client.slug}`} className="text-sm hover:underline">{i.client.name}</Link> },
    { key: "provider", header: "Provider", cell: (i) => <span className="font-medium">{PROVIDER_LABELS[i.provider]}</span> },
    { key: "label", header: "Property", cell: (i) => <span className="text-sm text-muted-foreground">{i.label ?? "—"}</span> },
    { key: "status", header: "Status", cell: (i) => <Badge tone={integrationTone(i.status)}>{INTEGRATION_STATUS_LABELS[i.status]}</Badge> },
    { key: "lastSync", header: "Last sync", cell: (i) => <span className="text-sm text-muted-foreground">{i.lastSyncAt ? fmtDateTime(i.lastSyncAt) : "—"}</span> },
    { key: "error", header: "Error", cell: (i) => i.lastError ? <span className="text-xs text-danger">{i.lastError}</span> : <span className="text-muted-foreground">—</span> },
  ];

  const connected = integrations.filter((i) => i.status === "CONNECTED").length;
  const errors = integrations.filter((i) => i.status === "ERROR" || i.status === "EXPIRED").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Integrations" description={`${connected} connected · ${errors} need attention`} />

      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <div className="text-sm text-muted-foreground">
            <p>Provider adapters let you connect Google Search Console, GA4, PageSpeed and rank-tracking providers without changing the app.</p>
            <p className="mt-1">When an API is unavailable, use <b>CSV import</b> or <b>manual entry</b> from each client&apos;s tabs. The <b>Demo</b> provider clearly labels mock data and never shows it as live.</p>
          </div>
        </CardContent>
      </Card>

      {integrations.length === 0 ? (
        <EmptyState icon={<Plug className="h-8 w-8" />} title="No integrations configured" description="Connections created per-client will appear here. Phase 2 adds OAuth flows for Google Search Console and GA4." />
      ) : (
        <Card>
          <CardHeader><CardTitle>Connections ({integrations.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} rows={integrations} rowKey={(i) => i.id} empty="No integrations." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
