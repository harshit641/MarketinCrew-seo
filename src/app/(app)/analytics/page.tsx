import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { analyticsDailyTotals, analyticsRangeSummary } from "@/lib/queries/metrics";
import { resolvePreset } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ComparisonCard } from "@/components/kpi";
import { TrendChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const preset = resolvePreset("last28vsprev28");
  const clients = await prisma.client.findMany({ where: await getClientFilter(user), select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });

  const [daily, cur, prev] = await Promise.all([
    analyticsDailyTotals(user, preset.current),
    analyticsRangeSummary(user, preset.current),
    analyticsRangeSummary(user, preset.previous),
  ]);
  const trendData = daily.map((d) => ({ date: d.date.slice(5), sessions: d.sessions, users: d.users }));

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics (GA4)" description={`Organic traffic across all clients — ${preset.currentLabel} vs ${preset.previousLabel}.`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard label="Sessions" previous={prev.sessions} current={cur.sessions} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
        <ComparisonCard label="Users" previous={prev.users} current={cur.users} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
        <ComparisonCard label="New Users" previous={prev.newUsers} current={cur.newUsers} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
        <ComparisonCard label="Conversions" previous={prev.conversions} current={cur.conversions} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Organic Traffic</CardTitle>
          <span className="text-xs text-muted-foreground">Source: Google Analytics 4</span>
        </CardHeader>
        <CardContent>
          <TrendChart data={trendData} series={[{ key: "sessions", label: "Sessions" }, { key: "users", label: "Users" }]} type="area" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>View by client</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.slug}/analytics`} className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/40">
              <span className="font-medium">{c.name}</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
