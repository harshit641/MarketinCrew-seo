import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { gscDailyTotals, gscRangeSummary, topGscQueries, topGscPages } from "@/lib/queries/metrics";
import { resolvePreset } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { ComparisonCard } from "@/components/kpi";
import { AddSearchConsoleButton } from "../data-entry-actions";
import { GscConnector } from "./gsc-connector";
import { IntegrationProvider } from "@/generated/prisma/enums";
import { Suspense } from "react";
import { TrendChart } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { formatCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientSearchConsolePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const preset = resolvePreset("last28vsprev28");
  const [daily, cur, prev, queries, pages] = await Promise.all([
    gscDailyTotals(user, preset.current, client.id),
    gscRangeSummary(user, preset.current, client.id),
    gscRangeSummary(user, preset.previous, client.id),
    topGscQueries(user, client.id, preset.current, 12),
    topGscPages(user, client.id, preset.current, 10),
  ]);

  const trendData = daily.map((d) => ({ date: d.date.slice(5), clicks: d.clicks, impressions: d.impressions }));

  const queryCols: Column<(typeof queries)[number]>[] = [
    { key: "query", header: "Query", cell: (q) => <span className="font-medium">{q.query}</span> },
    { key: "clicks", header: "Clicks", align: "right", cell: (q) => <span className="font-medium">{q.clicks.toLocaleString()}</span> },
    { key: "imp", header: "Impressions", align: "right", cell: (q) => <span>{q.impressions.toLocaleString()}</span> },
    { key: "ctr", header: "CTR", align: "right", cell: (q) => <span>{(q.ctr * 100).toFixed(1)}%</span> },
    { key: "pos", header: "Avg Pos", align: "right", cell: (q) => <span>{q.position ?? "—"}</span> },
  ];

  const pageCols: Column<(typeof pages)[number]>[] = [
    { key: "page", header: "Page", cell: (p) => <span className="text-sm">{p.page.replace(/^https?:\/\/[^/]+/, "").slice(0, 45) || "/"}</span> },
    { key: "clicks", header: "Clicks", align: "right", cell: (p) => <span className="font-medium">{p.clicks.toLocaleString()}</span> },
    { key: "imp", header: "Impr.", align: "right", cell: (p) => <span>{formatCompact(p.impressions)}</span> },
    { key: "pos", header: "Avg Pos", align: "right", cell: (p) => <span>{p.position ?? "—"}</span> },
  ];

  const gscIntegration = client.integrations.find((i) => i.provider === IntegrationProvider.GOOGLE_SEARCH_CONSOLE);

  return (
    <div className="space-y-5">
      <PageHeader title="Search Console" description={`${preset.currentLabel} vs ${preset.previousLabel}.`} actions={<AddSearchConsoleButton clientId={client.id} />} />

      <Suspense fallback={null}>
        <GscConnector
          clientId={client.id}
          status={gscIntegration?.status ?? "NEVER_CONNECTED"}
          connected={gscIntegration?.status === "CONNECTED"}
          property={gscIntegration?.label}
          lastSync={gscIntegration?.lastSyncAt}
          lastError={gscIntegration?.lastError}
        />
      </Suspense>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard label="Clicks" previous={prev.clicks} current={cur.clicks} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Search Console" />
        <ComparisonCard label="Impressions" previous={prev.impressions} current={cur.impressions} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Search Console" />
        <ComparisonCard label="Avg CTR" previous={prev.ctr} current={cur.ctr} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} higherIsBetter dataSource="Google Search Console" format={(n) => `${(n * 100).toFixed(1)}%`} />
        <ComparisonCard label="Avg Position" previous={prev.position} current={cur.position} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} higherIsBetter={false} dataSource="Google Search Console" format={(n) => n.toFixed(1)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Clicks & Impressions — {preset.currentLabel}</CardTitle>
          <span className="text-xs text-muted-foreground">Source: Google Search Console</span>
        </CardHeader>
        <CardContent>
          <TrendChart data={trendData} series={[{ key: "clicks", label: "Clicks" }, { key: "impressions", label: "Impressions" }]} type="area" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Queries</CardTitle></CardHeader>
          <CardContent className="p-0"><DataTable columns={queryCols} rows={queries} rowKey={(q) => q.query} empty="No query data." /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent className="p-0"><DataTable columns={pageCols} rows={pages} rowKey={(p) => p.page} empty="No page data." /></CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Search Console &quot;average position&quot; is a Google-reported aggregate, NOT an exact SERP ranking. It is kept separate from the exact rank-tracking data on the Rankings tab.
      </p>
    </div>
  );
}
