import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, FileDown, Share2, ArrowLeft, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { assembleReportData } from "@/lib/reports/data";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from "@/components/ui";
import { ComparisonCard } from "@/components/kpi";
import { BarSeries, DonutChart } from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { fmtRange, fmtDate } from "@/lib/dates";
import { formatPosition, formatMinutes, domainFromUrl } from "@/lib/utils";
import { TASK_CATEGORY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";
import { ReportStatus } from "@/generated/prisma/enums";
import { ReportActions } from "./report-actions";
import { SectionCommentary } from "./section-commentary";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const filter = await getClientFilter(user);
  const report = await prisma.report.findFirst({
    where: { id, client: filter },
    include: {
      client: { select: { id: true, name: true, slug: true, logoUrl: true } },
      sections: { orderBy: { order: "asc" } },
      createdBy: { select: { name: true } },
      approver: { select: { name: true } },
    },
  });
  if (!report) notFound();

  const data = await assembleReportData(
    user,
    report.client.id,
    { start: report.periodStart, end: report.periodEnd },
    // previous period = same length immediately before
    { start: new Date(report.periodStart.getTime() - (report.periodEnd.getTime() - report.periodStart.getTime())), end: new Date(report.periodStart.getTime()) },
    fmtRange(report.periodStart, report.periodEnd),
    "Previous period",
    report.includeApprovedOnly,
  );

  const canEdit = hasPermission(user.role, PERMISSIONS.CREATE_REPORT);
  const canApprove = hasPermission(user.role, PERMISSIONS.APPROVE_REPORT);
  const canDeliver = hasPermission(user.role, PERMISSIONS.DELIVER_REPORT);

  const enabledSections = report.sections.filter((s) => s.isEnabled);

  // Ranking distribution data
  const rankDist = [
    { label: "Top 3", value: data.ranking.buckets.top3 },
    { label: "4-10", value: data.ranking.buckets.top10 },
    { label: "11-20", value: data.ranking.buckets.top20 },
    { label: "21-50", value: data.ranking.buckets.top50 },
    { label: "51-100", value: data.ranking.buckets.top100 },
  ];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/reports"><ArrowLeft className="h-4 w-4" /> Back to reports</Link></Button>

      <PageHeader
        title={report.title}
        description={`${report.client.name} · ${fmtRange(report.periodStart, report.periodEnd)}`}
        actions={
          <div className="flex gap-2">
            <Badge tone={report.status === "DELIVERED" ? "success" : report.status === "APPROVED" ? "primary" : "warning"} className="text-sm">
              {report.status}
            </Badge>
          </div>
        }
      />

      <ReportActions
        reportId={report.id}
        status={report.status}
        canEdit={canEdit}
        canApprove={canApprove}
        canDeliver={canDeliver}
        clientSlug={report.client.slug}
      />

      {/* Executive summary editor */}
      {canEdit && (
        <Card>
          <CardHeader><CardTitle>Editable commentary</CardTitle></CardHeader>
          <CardContent>
            <SectionCommentary
              reportId={report.id}
              initial={{
                executiveSummary: report.executiveSummary ?? "",
                keyWins: report.keyWins ?? "",
                issuesRisks: report.issuesRisks ?? "",
                recommendations: report.recommendations ?? "",
                nextMonthPlan: report.nextMonthPlan ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Report body */}
      <div className="space-y-4">
        {report.executiveSummary && (
          <Card><CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader><CardContent><p className="whitespace-pre-line text-sm">{report.executiveSummary}</p></CardContent></Card>
        )}

        {/* KPIs */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Key SEO KPIs</CardTitle>
            <span className="text-xs text-muted-foreground">{data.periodLabel} vs {data.previousPeriodLabel}</span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ComparisonCard label="Organic Clicks" previous={data.gsc.previous.clicks} current={data.gsc.current.clicks} previousLabel="Prev." currentLabel="Current" dataSource="Search Console" />
              <ComparisonCard label="Impressions" previous={data.gsc.previous.impressions} current={data.gsc.current.impressions} previousLabel="Prev." currentLabel="Current" dataSource="Search Console" />
              <ComparisonCard label="Sessions" previous={data.analytics.previous.sessions} current={data.analytics.current.sessions} previousLabel="Prev." currentLabel="Current" dataSource="GA4" />
              <ComparisonCard label="Conversions" previous={data.analytics.previous.conversions} current={data.analytics.current.conversions} previousLabel="Prev." currentLabel="Current" dataSource="GA4" />
            </div>
          </CardContent>
        </Card>

        {/* Rankings */}
        <Card>
          <CardHeader><CardTitle>Keyword Ranking Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center lg:grid-cols-6">
              <Stat label="Tracked" value={data.ranking.totals.tracked} />
              <Stat label="Top 3" value={data.ranking.totals.top3} />
              <Stat label="Top 10" value={data.ranking.totals.top10} />
              <Stat label="Top 20" value={data.ranking.totals.top20} />
              <Stat label="Avg pos" value={data.ranking.totals.avgPosition ?? "—"} />
              <Stat label="Improved" value={data.ranking.totals.improved} tone="text-success" />
            </div>
            <BarSeries data={rankDist} series={[{ key: "value", label: "Keywords" }]} xKey="label" height={180} />
          </CardContent>
        </Card>

        {/* Top improvements */}
        {data.ranking.winners.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Top Ranking Improvements</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {data.ranking.winners.slice(0, 8).map((k) => (
                  <li key={k.keywordId} className="flex justify-between">
                    <span>{k.keyword}</span>
                    <span className="font-medium text-success">▲ {k.change} → #{k.currentPos}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Backlinks */}
        <Card>
          <CardHeader><CardTitle>Backlink Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Live" value={data.backlinks.live} />
              <Stat label="Lost" value={data.backlinks.lost} tone="text-danger" />
              <Stat label="New (period)" value={data.backlinks.newThisPeriod.length} tone="text-success" />
            </div>
          </CardContent>
        </Card>

        {/* Technical */}
        <Card>
          <CardHeader><CardTitle>Technical SEO Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Open" value={data.technical.open} tone="text-warning" />
              <Stat label="Critical/High" value={data.technical.critical} tone="text-danger" />
              <Stat label="Resolved" value={data.technical.resolved} tone="text-success" />
            </div>
          </CardContent>
        </Card>

        {/* Tasks completed */}
        <Card>
          <CardHeader><CardTitle>Tasks Completed ({data.completedTasks.length})</CardTitle></CardHeader>
          <CardContent>
            {data.completedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks were completed during this period.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.completedTasks.map((t) => (
                  <li key={t.id} className="flex justify-between border-b border-border pb-1.5">
                    <span><Badge tone="neutral" className="mr-1.5">{TASK_CATEGORY_LABELS[t.category as keyof typeof TASK_CATEGORY_LABELS] ?? t.category}</Badge>{t.title}</span>
                    <span className="text-muted-foreground">{t.assignee?.name ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Work by category */}
        {data.workByCategory.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Work Completed by Category</CardTitle></CardHeader>
            <CardContent>
              <BarSeries
                data={data.workByCategory.map((w) => ({ label: TASK_CATEGORY_LABELS[w.category as keyof typeof TASK_CATEGORY_LABELS] ?? w.category, minutes: w.minutes }))}
                series={[{ key: "minutes", label: "Minutes" }]}
                layout="vertical"
                height={Math.max(180, data.workByCategory.length * 36)}
              />
              <p className="mt-2 text-xs text-muted-foreground">Total approved time: {formatMinutes(data.workByCategory.reduce((s, w) => s + w.minutes, 0))}</p>
            </CardContent>
          </Card>
        )}

        {/* Commentary sections */}
        {report.keyWins && <CommentaryBlock title="Key Wins" body={report.keyWins} tone="success" />}
        {report.issuesRisks && <CommentaryBlock title="Issues & Risks" body={report.issuesRisks} tone="warning" />}
        {report.recommendations && <CommentaryBlock title="Recommendations" body={report.recommendations} tone="info" />}
        {report.nextMonthPlan && <CommentaryBlock title="Next Month's Plan" body={report.nextMonthPlan} tone="neutral" />}

        {/* Methodology */}
        <Card>
          <CardHeader><CardTitle>Methodology & Data Sources</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>• Organic clicks, impressions, CTR and average position: Google Search Console.</p>
            <p>• Organic sessions, users, conversions: Google Analytics 4.</p>
            <p>• Keyword positions: exact SERP rank tracking (separate from Search Console average position).</p>
            <p>• Backlinks: link index provider + manual tracking. Position 101 = &quot;Not in top 100&quot;.</p>
            <p>• Work completed: only approved daily work logs and completed tasks within {data.periodLabel}.</p>
            <p>• Ranking change = previous position − current position (positive = improvement).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <p className={`text-xl font-semibold ${tone ?? ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CommentaryBlock({ title, body, tone }: { title: string; body: string; tone: string }) {
  const borderTone = tone === "success" ? "border-l-success" : tone === "warning" ? "border-l-warning" : tone === "info" ? "border-l-info" : "border-l-muted";
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="whitespace-pre-line text-sm text-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
