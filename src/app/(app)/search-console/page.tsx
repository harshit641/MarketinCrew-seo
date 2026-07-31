import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { gscDailyTotals, gscRangeSummary } from "@/lib/queries/metrics";
import { resolvePreset } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { ComparisonCard } from "@/components/kpi";
import { TrendChart } from "@/components/charts";
import { formatCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SearchConsoleOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const preset = resolvePreset("last28vsprev28");
  const clients = await prisma.client.findMany({ where: await getClientFilter(user), select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });

  const [daily, cur, prev] = await Promise.all([
    gscDailyTotals(user, preset.current),
    gscRangeSummary(user, preset.current),
    gscRangeSummary(user, preset.previous),
  ]);
  const trendData = daily.map((d) => ({ date: d.date.slice(5), clicks: d.clicks, impressions: d.impressions }));

  return (
    <div className="space-y-5">
      <PageHeader title="Search Console" description={`Organic search performance across all clients — ${preset.currentLabel} vs ${preset.previousLabel}.`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard label="Total Clicks" previous={prev.clicks} current={cur.clicks} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Search Console" />
        <ComparisonCard label="Total Impressions" previous={prev.impressions} current={cur.impressions} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Search Console" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Organic Clicks & Impressions</CardTitle>
          <span className="text-xs text-muted-foreground">Source: Google Search Console</span>
        </CardHeader>
        <CardContent>
          <TrendChart data={trendData} series={[{ key: "clicks", label: "Clicks" }, { key: "impressions", label: "Impressions" }]} type="area" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>View by client</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.slug}/search-console`} className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/40">
              <span className="font-medium">{c.name}</span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {clients.length === 0 && <EmptyState title="No clients" />}
        </CardContent>
      </Card>
    </div>
  );
}
