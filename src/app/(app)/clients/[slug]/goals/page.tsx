import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, EmptyState } from "@/components/ui";
import { Target } from "lucide-react";
import { fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const GOAL_LABELS: Record<string, string> = {
  INCREASE_ORGANIC_CLICKS: "Increase Organic Clicks",
  INCREASE_ORGANIC_CONVERSIONS: "Increase Organic Conversions",
  IMPROVE_TOP10_KEYWORDS: "Improve Top-10 Keywords",
  IMPROVE_LOCAL_VISIBILITY: "Improve Local Visibility",
  INCREASE_NON_BRANDED_TRAFFIC: "Increase Non-branded Traffic",
  INCREASE_REFERRING_DOMAINS: "Increase Referring Domains",
  RESOLVE_INDEXING: "Resolve Indexing Issues",
  IMPROVE_CORE_WEB_VITALS: "Improve Core Web Vitals",
  PUBLISH_OPTIMIZE_PAGES: "Publish / Optimize Pages",
  IMPROVE_PRODUCT_SERVICE_LOCATION: "Improve Product/Service/Location",
  CUSTOM: "Custom Goal",
};

const STATUS_TONE: Record<string, any> = {
  ON_TRACK: "success", ACHIEVED: "success", AT_RISK: "warning", BEHIND: "danger", NOT_STARTED: "neutral",
};

export default async function ClientGoalsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const goals = client.goals;

  return (
    <div className="space-y-5">
      <PageHeader title="Goals & KPIs" description="Measurable SEO objectives for this client." />

      {goals.length === 0 ? (
        <EmptyState icon={<Target className="h-8 w-8" />} title="No goals set" description="Managers can create measurable SEO goals (e.g. reach 15 keywords in top 10) from this page." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => {
            const progress = g.baselineValue != null && g.targetValue != null && g.currentValue != null
              ? Math.min(100, Math.round(((g.currentValue - g.baselineValue) / (g.targetValue - g.baselineValue)) * 100))
              : null;
            return (
              <Card key={g.id}>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{GOAL_LABELS[g.type] ?? g.type}</p>
                      <p className="font-semibold">{g.title}</p>
                    </div>
                    <Badge tone={STATUS_TONE[g.status]}>{g.status.replace("_", " ")}</Badge>
                  </div>

                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{g.currentValue?.toLocaleString() ?? "—"}</span>
                    <span className="text-sm text-muted-foreground">/ {g.targetValue?.toLocaleString() ?? "—"} {g.unit}</span>
                  </div>

                  {progress != null && (
                    <div className="mb-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${progress >= 100 ? "bg-success" : progress >= 50 ? "bg-primary" : "bg-warning"}`}
                          style={{ width: `${Math.max(2, progress)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{progress}% of target · baseline {g.baselineValue?.toLocaleString()}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fmtDate(g.startDate)} → {g.endDate ? fmtDate(g.endDate) : "ongoing"}</span>
                  </div>
                  {g.notes && <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">{g.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
