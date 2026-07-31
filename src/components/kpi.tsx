import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ===========================================================================
   KPI / stat display primitives.
   =========================================================================== */

export function StatCard({
  label,
  value,
  icon,
  hint,
  delta,
  deltaDirection,
  deltaSuffix = "%",
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  delta?: number | null;
  /** "up" = green, "down" = red, "flat" = neutral. For some metrics up is bad
   *  (e.g. overdue tasks), so pass deltaDirection explicitly. */
  deltaDirection?: "good" | "bad" | "neutral";
  deltaSuffix?: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              tone === "primary" && "bg-primary/10 text-primary",
              tone === "success" && "bg-success/10 text-success",
              tone === "warning" && "bg-warning/10 text-warning",
              tone === "danger" && "bg-danger/10 text-danger",
              tone === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {(hint || delta != null) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {delta != null && <DeltaPill delta={delta} direction={deltaDirection} suffix={deltaSuffix} />}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}

function DeltaPill({
  delta,
  direction = "neutral",
  suffix = "%",
}: {
  delta: number;
  direction?: "good" | "bad" | "neutral";
  suffix?: string;
}) {
  if (delta === 0 || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
        <Minus className="h-3 w-3" /> 0{suffix}
      </span>
    );
  }
  const positive = delta > 0;
  const isGood =
    direction === "neutral" ? null : direction === "good" ? positive : !positive;
  const color = isGood === null ? "text-muted-foreground" : isGood ? "text-success" : "text-danger";
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", color)}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(delta).toFixed(1)}
      {suffix}
    </span>
  );
}

/**
 * Comparison card: shows previous vs current value with absolute + % change.
 * Used for date-range comparisons across the app. Always states both ranges.
 */
export function ComparisonCard({
  label,
  previous,
  current,
  previousLabel,
  currentLabel,
  higherIsBetter = true,
  format = (n) => n.toLocaleString(),
  dataSource,
  lastSync,
}: {
  label: string;
  previous: number | null;
  current: number | null;
  previousLabel: string;
  currentLabel: string;
  higherIsBetter?: boolean;
  format?: (n: number) => string;
  dataSource?: string;
  lastSync?: string | Date | null;
}) {
  const abs = previous != null && current != null ? current - previous : null;
  const pct =
    previous != null && current != null && previous !== 0
      ? ((current - previous) / Math.abs(previous)) * 100
      : null;

  const direction: "good" | "bad" | "neutral" =
    abs == null || abs === 0 ? "neutral" : (abs > 0) === higherIsBetter ? "good" : "bad";

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-foreground">
          {current != null ? format(current) : "—"}
        </span>
        {pct != null && (
          <span
            className={cn(
              "text-sm font-medium",
              direction === "good" && "text-success",
              direction === "bad" && "text-danger",
              direction === "neutral" && "text-muted-foreground",
            )}
          >
            {pct > 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">{previous != null ? format(previous) : "—"}</p>
          <p>{previousLabel}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">{current != null ? format(current) : "—"}</p>
          <p>{currentLabel}</p>
        </div>
      </div>
      {abs != null && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {abs > 0 ? "+" : ""}
          {format(abs)} change
        </p>
      )}
      {dataSource && (
        <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Source: {dataSource}
          {lastSync ? ` · Synced ${formatLastSync(lastSync)}` : ""}
        </p>
      )}
    </Card>
  );
}

function formatLastSync(last: string | Date): string {
  const d = typeof last === "string" ? new Date(last) : last;
  const diff = Date.now() - d.getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d ago`;
  if (hrs >= 1) return `${hrs}h ago`;
  const mins = Math.floor(diff / 60_000);
  return mins <= 1 ? "just now" : `${mins}m ago`;
}
