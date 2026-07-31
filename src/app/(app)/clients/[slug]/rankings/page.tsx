import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, EmptyState } from "@/components/ui";
import { rankingComparison } from "@/lib/queries/metrics";
import { DataTable, type Column } from "@/components/data-table";
import { TrendChart } from "@/components/charts";
import { DateRangePicker } from "@/components/date-range-picker";
import { formatPosition, cn } from "@/lib/utils";
import { ImportRankingsButton } from "./import-rankings";
import { AddKeywordButton, AddRankingSnapshotButton } from "./rankings-actions";
import { Upload } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const now = new Date();
  const ranking = await rankingComparison(user, client.id, now, new Date(now.getTime() - 30 * 86400000));

  // keyword list for the "log ranking by date" dropdown
  const keywords = await prisma.keyword.findMany({
    where: { clientId: client.id, trackingStatus: "ACTIVE" },
    select: { id: true, keyword: true },
    orderBy: { keyword: "asc" },
  });

  // Custom date-range comparison (if the user picked custom dates).
  const hasCustom = Boolean(sp.aEnd && sp.bEnd);
  const customRanking = hasCustom
    ? await rankingComparison(user, client.id, new Date(sp.aEnd!), new Date(sp.bEnd!))
    : null;
  const aLabel = sp.aStart && sp.aEnd ? `${sp.aStart} → ${sp.aEnd}` : "Range A";
  const bLabel = sp.bStart && sp.bEnd ? `${sp.bStart} → ${sp.bEnd}` : "Range B";

  // Distribution chart data
  const distData = [
    { label: "Top 3", value: ranking.buckets.top3 },
    { label: "4-10", value: ranking.buckets.top10 },
    { label: "11-20", value: ranking.buckets.top20 },
    { label: "21-50", value: ranking.buckets.top50 },
    { label: "51-100", value: ranking.buckets.top100 },
    { label: "100+", value: ranking.buckets.beyond },
  ];

  // Winners/losers chart
  const changeData = ranking.keywords
    .filter((k) => k.change !== null && k.change !== 0)
    .slice(0, 12)
    .map((k) => ({
      label: k.keyword.length > 20 ? k.keyword.slice(0, 18) + "…" : k.keyword,
      improvement: (k.change ?? 0) > 0 ? k.change : 0,
      decline: (k.change ?? 0) < 0 ? Math.abs(k.change!) : 0,
    }));

  const columns: Column<(typeof ranking.keywords)[number]>[] = [
    {
      key: "keyword",
      header: "Keyword",
      cell: (k) => (
        <div>
          <span className="font-medium">{k.keyword}</span>
          {k.isBrand && <Badge tone="info" className="ml-1.5">Brand</Badge>}
        </div>
      ),
    },
    { key: "current", header: "Current", align: "right", cell: (k) => <span className="font-semibold">{formatPosition(k.currentPos)}</span> },
    { key: "previous", header: "Previous", align: "right", cell: (k) => <span className="text-muted-foreground">{k.previousPos != null ? formatPosition(k.previousPos) : "—"}</span> },
    {
      key: "change",
      header: "Change",
      align: "right",
      cell: (k) => {
        if (k.change == null || k.change === 0) return <span className="text-muted-foreground">—</span>;
        const up = k.change > 0;
        return (
          <span className={cn("font-medium", up ? "text-success" : "text-danger")}>
            {up ? "▲" : "▼"} {Math.abs(k.change)}
          </span>
        );
      },
    },
    {
      key: "url",
      header: "Ranking URL",
      cell: (k) =>
        k.rankingUrl ? (
          <a href={k.rankingUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            {k.rankingUrl.replace(/^https?:\/\//, "").slice(0, 40)}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Keyword Rankings"
        description="Exact SERP rankings. Position 101 = Not in top 100."
        actions={
          <div className="flex flex-wrap gap-2">
            <AddKeywordButton clientId={client.id} />
            <AddRankingSnapshotButton clientId={client.id} keywords={keywords} />
            <ImportRankingsButton clientId={client.id} />
          </div>
        }
      />

      {ranking.totals.tracked === 0 ? (
        <EmptyState
          icon={<Upload className="h-8 w-8" />}
          title="No ranking data yet"
          description="Import keywords, then import ranking snapshots for two dates to see comparisons."
          action={
            <div className="flex gap-2">
              <AddKeywordButton clientId={client.id} />
              <ImportRankingsButton clientId={client.id} />
            </div>
          }
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            <SummaryStat label="Tracked" value={ranking.totals.tracked} />
            <SummaryStat label="Top 3" value={ranking.totals.top3} />
            <SummaryStat label="Top 10" value={ranking.totals.top10} />
            <SummaryStat label="Top 20" value={ranking.totals.top20} />
            <SummaryStat label="Avg pos" value={ranking.totals.avgPosition ?? "—"} />
            <SummaryStat label="Improved" value={ranking.totals.improved} tone="text-success" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ranking Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Current positions · Source: exact SERP tracking</p>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={distData}
                  series={[{ key: "value", label: "Keywords" }]}
                  xKey="label"
                  emptyLabel="No data."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Movers (vs 30 days ago)</CardTitle>
                <p className="text-xs text-muted-foreground">Green = improved, red = declined</p>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={changeData}
                  series={[
                    { key: "improvement", label: "Improved", color: "#16a34a" },
                    { key: "decline", label: "Declined", color: "#dc2626" },
                  ]}
                  xKey="label"
                  emptyLabel="No movement in the period."
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Tracked Keywords ({ranking.keywords.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                rows={ranking.keywords}
                rowKey={(k) => k.keywordId}
                empty="No keywords."
              />
            </CardContent>
          </Card>

          {ranking.winners.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Top Improvements</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {ranking.winners.slice(0, 8).map((k) => (
                    <li key={k.keywordId} className="flex items-center justify-between text-sm">
                      <span>{k.keyword}</span>
                      <span className="text-success font-medium">▲ {k.change} (to #{k.currentPos})</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Custom date-range comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Compare Two Date Ranges</CardTitle>
              <p className="text-xs text-muted-foreground">Pick any two dates to compare keyword positions. Uses the latest snapshot on or before each date.</p>
            </CardHeader>
            <CardContent>
              <DateRangePicker
                defaults={{
                  aStart: sp.aStart ?? new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10),
                  aEnd: sp.aEnd ?? now.toISOString().slice(0, 10),
                  bStart: sp.bStart ?? new Date(now.getTime() - 37 * 86400000).toISOString().slice(0, 10),
                  bEnd: sp.bEnd ?? new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10),
                }}
              />

              {customRanking && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryStat label={`Top 10 (${aLabel})`} value={customRanking.totals.top10} />
                    <SummaryStat label={`Top 10 (${bLabel})`} value={"—"} />
                    <SummaryStat label="Net improved" value={customRanking.totals.improved} tone="text-success" />
                    <SummaryStat label="Net declined" value={customRanking.totals.declined} tone="text-danger" />
                  </div>
                  <div className="rounded-md border border-border">
                    <DataTable
                      columns={[
                        { key: "keyword", header: "Keyword", cell: (k) => <span className="font-medium">{k.keyword}</span> },
                        { key: "a", header: `Pos @ ${aLabel}`, align: "right", cell: (k) => <span>{formatPosition(k.currentPos)}</span> },
                        { key: "b", header: `Pos @ ${bLabel}`, align: "right", cell: (k) => <span className="text-muted-foreground">{k.previousPos != null ? formatPosition(k.previousPos) : "—"}</span> },
                        { key: "change", header: "Change", align: "right", cell: (k) => k.change == null || k.change === 0 ? <span className="text-muted-foreground">—</span> : <span className={cn("font-medium", k.change > 0 ? "text-success" : "text-danger")}>{k.change > 0 ? "▲" : "▼"} {Math.abs(k.change)}</span> },
                      ]}
                      rows={customRanking.keywords}
                      rowKey={(k) => k.keywordId}
                      empty="No ranking data for the selected dates."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Change = position in Range B − position in Range A (positive = improved, lower rank number = better). Position 101 = Not in top 100.</p>
                </div>
              )}
              {!hasCustom && <p className="mt-4 text-sm text-muted-foreground">Adjust the dates above to run a custom comparison.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-3 text-center">
      <p className={cn("text-xl font-semibold", tone)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}
