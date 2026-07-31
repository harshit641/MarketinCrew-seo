import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { analyticsDailyTotals, analyticsRangeSummary } from "@/lib/queries/metrics";
import { resolvePreset } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { ComparisonCard } from "@/components/kpi";
import { AddAnalyticsButton } from "../data-entry-actions";
import { TrendChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function ClientAnalyticsPage({
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
  const [daily, cur, prev] = await Promise.all([
    analyticsDailyTotals(user, preset.current, client.id),
    analyticsRangeSummary(user, preset.current, client.id),
    analyticsRangeSummary(user, preset.previous, client.id),
  ]);
  const trendData = daily.map((d) => ({ date: d.date.slice(5), sessions: d.sessions, users: d.users, conversions: d.conversions }));

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics (GA4)" description={`Organic performance — ${preset.currentLabel} vs ${preset.previousLabel}.`} actions={<AddAnalyticsButton clientId={client.id} />} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard label="Sessions" previous={prev.sessions} current={cur.sessions} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
        <ComparisonCard label="Users" previous={prev.users} current={cur.users} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
        <ComparisonCard label="New Users" previous={prev.newUsers} current={cur.newUsers} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
        <ComparisonCard label="Conversions" previous={prev.conversions} current={cur.conversions} previousLabel={preset.previousLabel} currentLabel={preset.currentLabel} dataSource="Google Analytics 4" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Organic Traffic — {preset.currentLabel}</CardTitle>
          <span className="text-xs text-muted-foreground">Source: Google Analytics 4</span>
        </CardHeader>
        <CardContent>
          <TrendChart data={trendData} series={[{ key: "sessions", label: "Sessions" }, { key: "users", label: "Users" }]} type="area" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conversions</CardTitle></CardHeader>
        <CardContent>
          <TrendChart data={trendData} series={[{ key: "conversions", label: "Conversions", color: "#16a34a" }]} />
        </CardContent>
      </Card>
    </div>
  );
}
