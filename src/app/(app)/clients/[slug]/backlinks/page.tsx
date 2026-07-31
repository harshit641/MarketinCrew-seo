import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { listBacklinks } from "@/lib/queries/backlinks";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { DataTable, type Column } from "@/components/data-table";
import { DonutChart } from "@/components/charts";
import { ImportBacklinksButton } from "./import-backlinks";
import { AddBacklinkButton } from "./backlinks-actions";
import { AhrefsConnector } from "../ahrefs-connector";
import { BACKLINK_STATUS_LABELS, LINK_TYPE_LABELS } from "@/lib/constants";
import { LinkType } from "@/generated/prisma/enums";
import { fmtDate } from "@/lib/dates";
import { Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientBacklinksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const backlinks = await listBacklinks(user, { clientId: client.id });
  const live = backlinks.filter((b) => b.status === "LIVE");
  const lost = backlinks.filter((b) => b.status === "LOST");
  const referringDomains = new Set(live.map((b) => b.referringDomain ?? b.sourceDomain)).size;

  const typeData = Object.values(LinkType).map((t) => ({
    name: LINK_TYPE_LABELS[t],
    value: live.filter((b) => b.linkType === t).length,
  })).filter((d) => d.value > 0);

  const columns: Column<(typeof backlinks)[number]>[] = [
    { key: "source", header: "Source", cell: (b) => (
      <div><span className="text-sm font-medium">{b.sourceDomain}</span><p className="truncate text-xs text-muted-foreground max-w-[200px]">{b.sourceUrl}</p></div>
    )},
    { key: "target", header: "Target", cell: (b) => <span className="text-xs">{b.targetUrl.replace(/^https?:\/\/[^/]+/, "").slice(0, 35) || "/"}</span> },
    { key: "anchor", header: "Anchor", cell: (b) => <span className="text-sm">{b.anchorText ?? "—"}</span> },
    { key: "type", header: "Type", cell: (b) => <Badge tone={b.linkType === "DOFOLLOW" ? "success" : "neutral"}>{LINK_TYPE_LABELS[b.linkType]}</Badge> },
    { key: "status", header: "Status", cell: (b) => <Badge tone={b.status === "LIVE" ? "success" : b.status === "LOST" ? "danger" : "warning"}>{BACKLINK_STATUS_LABELS[b.status]}</Badge> },
    { key: "dr", header: "DR", align: "right", cell: (b) => <span className="text-sm">{b.domainRating ?? "—"}</span> },
    { key: "acquired", header: "Acquired", cell: (b) => <span className="text-sm text-muted-foreground">{fmtDate(b.acquiredAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Backlinks" description={`${live.length} live · ${referringDomains} referring domains`} actions={<div className="flex gap-2"><AddBacklinkButton clientId={client.id} /><ImportBacklinksButton clientId={client.id} /></div>} />

      <AhrefsConnector clientId={client.id} status={client.integrations.find((i: any) => i.provider === "AHREFS")?.status ?? "NEVER_CONNECTED"} connected={client.integrations.some((i: any) => i.provider === "AHREFS" && i.status === "CONNECTED")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live" value={live.length} icon={<Link2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Referring Domains" value={referringDomains} icon={<Link2 className="h-4 w-4" />} tone="primary" />
        <StatCard label="Lost" value={lost.length} icon={<Link2 className="h-4 w-4" />} tone={lost.length > 0 ? "danger" : "neutral"} />
        <StatCard label="Total" value={backlinks.length} icon={<Link2 className="h-4 w-4" />} tone="neutral" />
      </div>

      {backlinks.length === 0 ? (
        <EmptyState icon={<Link2 className="h-8 w-8" />} title="No backlinks tracked" description="Add a backlink manually or import via CSV to begin tracking." action={<div className="flex gap-2"><AddBacklinkButton clientId={client.id} /><ImportBacklinksButton clientId={client.id} /></div>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Link Type Mix (live)</CardTitle></CardHeader>
            <CardContent><DonutChart data={typeData} emptyLabel="No live backlinks." /></CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>All Backlinks</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable columns={columns} rows={backlinks} rowKey={(b) => b.id} empty="No backlinks." />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
