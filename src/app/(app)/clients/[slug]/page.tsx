import Link from "next/link";
import { Users, Target, FileText, AlertTriangle, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClient } from "@/lib/queries";
import { prisma } from "@/lib/db";
import {
  gscRangeSummary,
  analyticsRangeSummary,
  rankingComparison,
  type DateRange,
} from "@/lib/queries/metrics";
import { resolvePreset } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from "@/components/ui";
import { ComparisonCard } from "@/components/kpi";
import { TrendChart } from "@/components/charts";
import { InsightsPanel } from "@/components/insights-panel";
import { generateClientInsights } from "@/lib/insights";
import { ROLE_LABELS, APPROVAL_STATUS_LABELS, approvalTone } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ClientOverviewPage({
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
  const range: DateRange = preset.current;
  const prevRange: DateRange = preset.previous;

  const [gscCur, gscPrev, gaCur, gaPrev, recentLogs, openAlerts, openTasks] = await Promise.all([
    gscRangeSummary(user, range, client.id),
    gscRangeSummary(user, prevRange, client.id),
    analyticsRangeSummary(user, range, client.id),
    analyticsRangeSummary(user, prevRange, client.id),
    prisma.workLog.findMany({
      where: { clientId: client.id },
      orderBy: { date: "desc" },
      take: 5,
      include: { items: true, employee: { include: { user: true } } },
    }),
    prisma.alertEvent.count({ where: { clientId: client.id, status: "ACTIVE" } }),
    prisma.task.count({ where: { clientId: client.id, status: { notIn: ["DONE", "CANCELLED"] }, deletedAt: null } }),
  ]);

  // Ranking comparison (latest snapshot vs 30 days ago)
  const now = new Date();
  const ranking = await rankingComparison(user, client.id, now, new Date(now.getTime() - 30 * 86400000));

  // AI insights (factual, from real data)
  const insights = await generateClientInsights(user, client.id);

  // Organic clicks trend (last 28 days)
  const trend = await import("@/lib/queries/metrics").then((m) =>
    m.gscDailyTotals(user, range, client.id),
  );
  const trendData = trend.map((d) => ({ date: d.date.slice(5), clicks: d.clicks }));

  return (
    <div className="space-y-6">
      {/* KPI comparison cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard
          label="Organic Clicks"
          previous={gscPrev.clicks}
          current={gscCur.clicks}
          previousLabel={preset.previousLabel}
          currentLabel={preset.currentLabel}
          dataSource={gscCur.dataSource}
        />
        <ComparisonCard
          label="Organic Impressions"
          previous={gscPrev.impressions}
          current={gscCur.impressions}
          previousLabel={preset.previousLabel}
          currentLabel={preset.currentLabel}
          dataSource={gscCur.dataSource}
        />
        <ComparisonCard
          label="Organic Sessions"
          previous={gaPrev.sessions}
          current={gaCur.sessions}
          previousLabel={preset.previousLabel}
          currentLabel={preset.currentLabel}
          dataSource={gaCur.dataSource}
        />
        <ComparisonCard
          label="Organic Conversions"
          previous={gaPrev.conversions}
          current={gaCur.conversions}
          previousLabel={preset.previousLabel}
          currentLabel={preset.currentLabel}
          dataSource={gaCur.dataSource}
        />
      </div>

      {/* AI Insights */}
      <InsightsPanel headline={insights.headline} insights={insights.insights} periodLabel={insights.periodLabel} />

      {/* Ranking summary + trend */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Organic Clicks — {preset.currentLabel}</CardTitle>
            <span className="text-xs text-muted-foreground">Source: {gscCur.dataSource}</span>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} series={[{ key: "clicks", label: "Clicks" }]} type="area" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keyword Rankings</CardTitle>
            <p className="text-xs text-muted-foreground">Latest snapshot vs 30 days ago</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <RankStat label="Keywords tracked" value={ranking.totals.tracked} />
            <RankStat label="Top 3" value={ranking.totals.top3} />
            <RankStat label="Top 10" value={ranking.totals.top10} />
            <RankStat label="Top 20" value={ranking.totals.top20} />
            <RankStat label="Avg. position" value={ranking.totals.avgPosition ?? "—"} />
            <div className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-center">
              <MiniStat label="Improved" value={ranking.totals.improved} tone="text-success" />
              <MiniStat label="Declined" value={ranking.totals.declined} tone="text-danger" />
              <MiniStat label="Unchanged" value={ranking.totals.unchanged} tone="text-muted-foreground" />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/clients/${client.slug}/rankings`}>View full rankings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Team + work + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team assigned yet.</p>
            ) : (
              client.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {a.employee.user.name[0]}
                    </span>
                    <span className="text-sm">{a.employee.user.name}</span>
                  </div>
                  <Badge tone="neutral">{ROLE_LABELS[a.role].replace("SEO ", "")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Work</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href={`/clients/${client.slug}/work`}>All work</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLogs.length === 0 ? (
              <EmptyState title="No work logged yet" description="Daily work logs will appear here." />
            ) : (
              recentLogs.map((wl) => (
                <div key={wl.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {wl.employee?.user?.name?.[0] ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{wl.items[0]?.workCompleted?.slice(0, 100) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{wl.employee?.user?.name} · {fmtDate(wl.date)}</p>
                  </div>
                  <Badge tone={approvalTone(wl.approvalStatus)}>{APPROVAL_STATUS_LABELS[wl.approvalStatus]}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats footer */}
      <div className="grid gap-3 sm:grid-cols-4">
        <FooterStat icon={<Target className="h-4 w-4" />} label="Open tasks" value={openTasks} href={`/clients/${client.slug}/tasks`} />
        <FooterStat icon={<AlertTriangle className="h-4 w-4" />} label="Active alerts" value={openAlerts} href="/alerts" />
        <FooterStat icon={<FileText className="h-4 w-4" />} label="Reports" value={client._count.reports} href={`/clients/${client.slug}/reports`} />
        <FooterStat icon={<Users className="h-4 w-4" />} label="Team members" value={client.assignments.length} href={`/clients/${client.slug}/settings`} />
      </div>
    </div>
  );
}

function RankStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FooterStat({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3 transition-colors hover:bg-muted/40">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</span>
      <div>
        <p className="text-lg font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}
