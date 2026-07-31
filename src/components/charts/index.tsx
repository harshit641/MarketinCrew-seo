"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

/* ===========================================================================
   Chart primitives built on Recharts. Consistent palette, grid, and tooltips.
   All charts are responsive and render to SVG so they stay crisp in PDF.
   =========================================================================== */

export const CHART_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
];

const axisStyle = { fontSize: 11, fill: "#64748b" };

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label != null && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p: TooltipEntry, i: number) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface SeriesConfig {
  key: string;
  label: string;
  color?: string;
}

export function TrendChart({
  data,
  series,
  xKey = "date",
  height = 240,
  type = "line",
  yFormatter,
  emptyLabel = "No data for the selected range.",
}: {
  data: Record<string, unknown>[];
  series: SeriesConfig[];
  xKey?: string;
  height?: number;
  type?: "line" | "area";
  yFormatter?: (v: number) => string;
  emptyLabel?: string;
}) {
  if (!data.length) {
    return <EmptyChart label={emptyLabel} height={height} />;
  }
  const yTickFormatter = yFormatter ?? ((v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)));
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} tickFormatter={yTickFormatter} />
          <Tooltip content={<ChartTooltip />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} tickFormatter={yTickFormatter} />
          <Tooltip content={<ChartTooltip />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function BarSeries({
  data,
  series,
  xKey = "label",
  height = 240,
  yFormatter,
  layout = "horizontal",
  emptyLabel = "No data available.",
}: {
  data: Record<string, unknown>[];
  series: SeriesConfig[];
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  layout?: "horizontal" | "vertical";
  emptyLabel?: string;
}) {
  if (!data.length) return <EmptyChart label={emptyLabel} height={height} />;
  const yTick = yFormatter ?? ((v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 12, left: layout === "vertical" ? 8 : 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={layout === "vertical"} horizontal={layout !== "vertical"} />
        {layout === "horizontal" ? (
          <>
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} tickFormatter={yTick} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={yTick} />
            <YAxis type="category" dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} width={120} />
          </>
        )}
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            radius={layout === "horizontal" ? [4, 4, 0, 0] : [0, 4, 4, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 220,
  emptyLabel = "No data available.",
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  emptyLabel?: string;
}) {
  if (!data.length || data.every((d) => !d.value)) return <EmptyChart label={emptyLabel} height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EmptyChart({ label, height = 240 }: { label?: string; height?: number }) {
  return (
    <div
      className={cn("flex items-center justify-center text-sm text-muted-foreground")}
      style={{ height }}
    >
      {label ?? "No data available."}
    </div>
  );
}
