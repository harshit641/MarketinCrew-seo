import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { listBacklinks } from "@/lib/queries/backlinks";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, EmptyState, Badge, Button, Select } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { DataTable, type Column } from "@/components/data-table";
import { Link2, Download } from "lucide-react";
import { BACKLINK_STATUS_LABELS, LINK_TYPE_LABELS } from "@/lib/constants";
import { LinkType, BacklinkStatus } from "@/generated/prisma/enums";
import { fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BacklinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;

  const clients = await prisma.client.findMany({
    where: await getClientFilter(user),
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const backlinks = await listBacklinks(user, {
    clientId: sp.client && sp.client !== "ALL" ? sp.client : undefined,
    status: sp.status && sp.status !== "ALL" ? sp.status : undefined,
    linkType: sp.type && sp.type !== "ALL" ? sp.type : undefined,
    search: sp.q,
  });

  const live = backlinks.filter((b) => b.status === BacklinkStatus.LIVE);
  const lost = backlinks.filter((b) => b.status === BacklinkStatus.LOST);
  const dofollow = live.filter((b) => b.linkType === LinkType.DOFOLLOW);
  const referringDomains = new Set(live.map((b) => b.referringDomain ?? b.sourceDomain)).size;

  const columns: Column<(typeof backlinks)[number]>[] = [
    {
      key: "source",
      header: "Source",
      cell: (b) => (
        <div className="min-w-0">
          <a href={b.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
            {b.sourceDomain}
          </a>
          <p className="truncate text-xs text-muted-foreground">{b.sourceUrl.replace(/^https?:\/\//, "").slice(0, 50)}</p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      cell: (b) => <span className="text-sm">{b.targetUrl.replace(/^https?:\/\/[^/]+/, "").slice(0, 40) || "/"}</span>,
    },
    { key: "anchor", header: "Anchor", cell: (b) => <span className="text-sm text-muted-foreground">{b.anchorText ?? "—"}</span> },
    {
      key: "type",
      header: "Type",
      cell: (b) => <Badge tone={b.linkType === "DOFOLLOW" ? "success" : "neutral"}>{LINK_TYPE_LABELS[b.linkType]}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => <Badge tone={b.status === "LIVE" ? "success" : b.status === "LOST" ? "danger" : "warning"}>{BACKLINK_STATUS_LABELS[b.status]}</Badge>,
    },
    { key: "dr", header: "DR", align: "right", cell: (b) => <span className="text-sm">{b.domainRating ?? "—"}</span> },
    { key: "acquired", header: "Acquired", cell: (b) => <span className="text-sm text-muted-foreground">{fmtDate(b.acquiredAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Backlinks"
        description={`${live.length} live backlinks from ${referringDomains} referring domains.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/templates/backlinks.csv" download><Download className="h-4 w-4" /> CSV template</a>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live Backlinks" value={live.length} icon={<Link2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Referring Domains" value={referringDomains} icon={<Link2 className="h-4 w-4" />} tone="primary" />
        <StatCard label="Dofollow (live)" value={dofollow.length} icon={<Link2 className="h-4 w-4" />} tone="neutral" />
        <StatCard label="Lost" value={lost.length} icon={<Link2 className="h-4 w-4" />} tone={lost.length > 0 ? "danger" : "neutral"} />
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by URL, domain or anchor…"
          className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Select name="client" defaultValue={sp.client ?? "ALL"} className="w-auto">
          <option value="ALL">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="status" defaultValue={sp.status ?? "ALL"} className="w-auto">
          <option value="ALL">All statuses</option>
          {Object.entries(BACKLINK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select name="type" defaultValue={sp.type ?? "ALL"} className="w-auto">
          <option value="ALL">All types</option>
          {Object.entries(LINK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Button type="submit" size="sm">Filter</Button>
      </form>

      {backlinks.length === 0 ? (
        <EmptyState icon={<Link2 className="h-8 w-8" />} title="No backlinks yet" description="Import backlinks via CSV from a client's backlinks tab." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} rows={backlinks} rowKey={(b) => b.id} empty="No backlinks match these filters." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
