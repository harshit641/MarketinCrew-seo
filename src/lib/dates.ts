import {
  subDays,
  startOfMonth,
  endOfMonth,
  startOfToday,
  subMonths,
  format,
} from "date-fns";

/**
 * Date helpers + comparison presets. All presets return absolute ranges;
 * timezone-boundary calculation uses the client's configured tz via Intl when
 * formatting display labels.
 */

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type PresetKey =
  | "last7vsprev7"
  | "last28vsprev28"
  | "thisMonthVsLastMonth"
  | "thisMonthVsLastYear"
  | "baselineVsCurrent";

export interface RangePair {
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
  currentLabel: string;
  previousLabel: string;
}

export function resolvePreset(key: PresetKey, baselineDate?: Date | null): RangePair {
  const today = startOfToday();
  switch (key) {
    case "last7vsprev7":
      return {
        current: { start: subDays(today, 6), end: endOfDay(today) },
        previous: { start: subDays(today, 13), end: subDays(today, 7) },
        currentLabel: "Last 7 days",
        previousLabel: "Previous 7 days",
      };
    case "last28vsprev28":
      return {
        current: { start: subDays(today, 27), end: endOfDay(today) },
        previous: { start: subDays(today, 55), end: subDays(today, 28) },
        currentLabel: "Last 28 days",
        previousLabel: "Previous 28 days",
      };
    case "thisMonthVsLastMonth": {
      const momStart = startOfMonth(today);
      const momEnd = endOfMonth(today);
      return {
        current: { start: momStart, end: momEnd },
        previous: { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) },
        currentLabel: format(today, "MMM yyyy"),
        previousLabel: format(subMonths(today, 1), "MMM yyyy"),
      };
    }
    case "thisMonthVsLastYear": {
      return {
        current: { start: startOfMonth(today), end: endOfMonth(today) },
        previous: { start: startOfMonth(subMonths(today, 12)), end: endOfMonth(subMonths(today, 12)) },
        currentLabel: format(today, "MMM yyyy"),
        previousLabel: format(subMonths(today, 12), "MMM yyyy"),
      };
    }
    case "baselineVsCurrent": {
      const base = baselineDate ? startOfDay(baselineDate) : subDays(today, 90);
      return {
        current: { start: startOfMonth(today), end: endOfDay(today) },
        previous: { start: base, end: endOfDay(base) },
        currentLabel: "Current",
        previousLabel: "Baseline",
      };
    }
  }
}

export function fmtRange(start: Date | string, end: Date | string): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return format(typeof d === "string" ? new Date(d) : d, "d MMM yyyy");
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return format(typeof d === "string" ? new Date(d) : d, "d MMM yyyy, HH:mm");
}
