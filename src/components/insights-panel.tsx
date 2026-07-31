import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import type { Insight } from "@/lib/insights";

const ICONS = {
  win: TrendingUp,
  risk: AlertTriangle,
  opportunity: Lightbulb,
  info: Info,
} as const;

const TONES = {
  win: "success",
  risk: "danger",
  opportunity: "info",
  info: "neutral",
} as const;

export function InsightsPanel({
  headline,
  insights,
  periodLabel,
  compact = false,
}: {
  headline: string;
  insights: Insight[];
  periodLabel?: string;
  compact?: boolean;
}) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          AI Insights
        </CardTitle>
        {periodLabel && <Badge tone="neutral">{periodLabel}</Badge>}
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm font-medium text-foreground">{headline}</p>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant changes detected in this period.</p>
        ) : (
          <ul className={`space-y-2 ${compact ? "" : ""}`}>
            {insights.map((ins, i) => {
              const Icon = ICONS[ins.type];
              return (
                <li key={i} className="flex items-start gap-2.5 rounded-md border border-border p-2.5">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-${TONES[ins.type]}/10`}>
                    <Icon className={`h-3.5 w-3.5 text-${TONES[ins.type]}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ins.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{ins.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Insights are generated from your real data. Numbers are never invented. Always review before sharing with clients.
        </p>
      </CardContent>
    </Card>
  );
}
