import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { listKeywords } from "@/lib/queries/keywords";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, EmptyState, Badge, Select, Button } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { formatPosition, cn } from "@/lib/utils";
import { Download, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RankingsPage({
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

  const keywords = await listKeywords(user, {
    clientId: sp.client && sp.client !== "ALL" ? sp.client : undefined,
    search: sp.q,
    isBrand: sp.brand === "brand" ? true : sp.brand === "non-brand" ? false : undefined,
  });

  const columns: Column<(typeof keywords)[number]>[] = [
    {
      key: "keyword",
      header: "Keyword",
      cell: (k) => (
        <div>
          <span className="font-medium">{k.keyword}</span>
          <div className="flex items-center gap-1">
            {k.isBrand && <Badge tone="info">Brand</Badge>}
            {k.keywordGroup && <Badge tone="neutral">{k.keywordGroup.name}</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (k) => {
        const cl = clients.find((c) => c.id === k.clientId);
        return cl ? <Link href={`/clients/${cl.slug}/rankings`} className="text-sm hover:underline">{cl.name}</Link> : "—";
      },
    },
    { key: "sv", header: "Volume", align: "right", cell: (k) => <span className="text-sm">{k.searchVolume?.toLocaleString() ?? "—"}</span> },
    { key: "current", header: "Current", align: "right", cell: (k) => <span className="font-semibold">{formatPosition(k.currentPosition)}</span> },
    {
      key: "best",
      header: "Best",
      align: "right",
      cell: (k) => <span className="text-sm text-muted-foreground">{formatPosition(k.bestPosition)}</span>,
    },
    {
      key: "baseline",
      header: "Baseline",
      align: "right",
      cell: (k) => <span className="text-sm text-muted-foreground">{formatPosition(k.baselinePosition)}</span>,
    },
    {
      key: "url",
      header: "Target URL",
      cell: (k) =>
        k.targetUrl ? (
          <a href={k.targetUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {k.targetUrl.replace(/^https?:\/\//, "").slice(0, 35)}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const totalTracked = keywords.length;
  const top10 = keywords.filter((k) => (k.currentPosition ?? 101) <= 10).length;
  const improved = keywords.filter((k) => k.previousPosition != null && k.currentPosition != null && k.previousPosition > k.currentPosition).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Keyword Rankings"
        description={`${totalTracked} tracked keywords across your clients.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/templates/keywords.csv" download>
              <Download className="h-4 w-4" /> CSV template
            </a>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex flex-wrap flex-1 items-center gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search keywords…"
            className="h-9 min-w-[180px] flex-1 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Select name="client" defaultValue={sp.client ?? "ALL"} className="w-auto">
            <option value="ALL">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select name="brand" defaultValue={sp.brand ?? "ALL"} className="w-auto">
            <option value="ALL">All keywords</option>
            <option value="brand">Brand only</option>
            <option value="non-brand">Non-brand only</option>
          </Select>
          <Button type="submit" size="sm">Filter</Button>
        </form>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>Top 10: <b className="text-foreground">{top10}</b></span>
          <span className="text-success">Improved: <b>{improved}</b></span>
        </div>
      </div>

      {keywords.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="No keywords tracked yet"
          description="Import keywords via CSV from a client's rankings tab, or add them manually."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} rows={keywords} rowKey={(k) => k.id} empty="No keywords match these filters." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
