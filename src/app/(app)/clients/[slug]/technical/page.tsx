import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/kpi";
import { DataTable, type Column } from "@/components/data-table";
import { ISSUE_SEVERITY_LABELS, ISSUE_STATUS_LABELS, severityTone } from "@/lib/constants";
import { IssueSeverity } from "@/generated/prisma/enums";
import { Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fmtDate } from "@/lib/dates";
import { AddTechnicalFixButton, IssueStatusControl } from "./technical-actions";

export const dynamic = "force-dynamic";

export default async function ClientTechnicalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const filter = await getClientFilter(user);
  const [issues, pageSpeed] = await Promise.all([
    prisma.technicalIssue.findMany({
      where: { client: filter, clientId: client.id },
      orderBy: [{ severity: "asc" }, { lastSeenAt: "desc" }],
    }),
    prisma.pageSpeedSnapshot.findMany({
      where: { clientId: client.id },
      orderBy: [{ date: "desc" }, { device: "asc" }],
      take: 6,
    }),
  ]);

  const critical = issues.filter((i) => i.severity === IssueSeverity.CRITICAL || i.severity === IssueSeverity.HIGH).filter((i) => i.status === "OPEN");
  const resolved = issues.filter((i) => i.status === "RESOLVED");

  const columns: Column<(typeof issues)[number]>[] = [
    { key: "url", header: "URL", cell: (i) => <span className="text-sm">{i.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 40) || "/"}</span> },
    { key: "category", header: "Issue", cell: (i) => (
      <div>
        <span className="text-sm font-medium">{i.category}</span>
        {i.recommendedFix && <p className="text-xs text-muted-foreground">{i.recommendedFix}</p>}
      </div>
    ) },
    { key: "severity", header: "Severity", cell: (i) => <Badge tone={severityTone(i.severity)}>{ISSUE_SEVERITY_LABELS[i.severity]}</Badge> },
    { key: "status", header: "Status", cell: (i) => <Badge tone={i.status === "RESOLVED" ? "success" : i.status === "OPEN" ? "warning" : "neutral"}>{ISSUE_STATUS_LABELS[i.status]}</Badge> },
    { key: "action", header: "Action", cell: (i) => <IssueStatusControl issueId={i.id} currentStatus={i.status} /> },
    { key: "seen", header: "Last seen", cell: (i) => <span className="text-sm text-muted-foreground">{fmtDate(i.lastSeenAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Technical SEO & Fixes" description="Log technical fixes to be done, track PageSpeed, and resolve issues." actions={<AddTechnicalFixButton clientId={client.id} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open Issues" value={issues.filter((i) => i.status === "OPEN").length} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
        <StatCard label="Critical/High (open)" value={critical.length} icon={<AlertTriangle className="h-4 w-4" />} tone={critical.length > 0 ? "danger" : "neutral"} />
        <StatCard label="Resolved" value={resolved.length} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Total Tracked" value={issues.length} icon={<Wrench className="h-4 w-4" />} tone="neutral" />
      </div>

      {pageSpeed.length > 0 && (
        <Card>
          <CardHeader><CardTitle>PageSpeed Insights (latest)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pageSpeed.map((ps) => (
                <div key={ps.id} className="rounded-md border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{ps.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 25) || "/"}</span>
                    <Badge tone="info">{ps.device}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <Metric label="Perf" value={ps.performance} />
                    <Metric label="A11y" value={ps.accessibility} />
                    <Metric label="BP" value={ps.bestPractices} />
                    <Metric label="SEO" value={ps.seo} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] text-muted-foreground">
                    <span>LCP {(ps.lcp! / 1000).toFixed(1)}s</span>
                    <span>INP {ps.inp}ms</span>
                    <span>CLS {ps.cls}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Technical Issues ({issues.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {issues.length === 0 ? (
            <EmptyState icon={<Wrench className="h-8 w-8" />} title="No technical issues tracked" description="Import issues via Screaming Frog/Ahrefs CSV (Phase 2) or add manually." />
          ) : (
            <DataTable columns={columns} rows={issues} rowKey={(i) => i.id} empty="No issues." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  if (value == null) return <div><p className="text-muted-foreground">—</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
  const tone = value >= 90 ? "text-success" : value >= 50 ? "text-warning" : "text-danger";
  return <div><p className={`text-lg font-semibold ${tone}`}>{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>;
}
