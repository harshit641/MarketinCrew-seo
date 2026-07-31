import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class merge helper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract a registered-looking domain from a URL (best-effort). */
export function domainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

/** Format a number compactly (e.g. 12.3K). */
export function formatCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Format a position. 101 = "Not in top 100". */
export function formatPosition(pos: number | null | undefined): string {
  if (pos == null) return "—";
  if (pos >= 101) return "Not in top 100";
  return `#${pos}`;
}

/** Signed percentage difference. Handles zero baselines safely. */
export function pctChange(prev: number | null, curr: number | null): number | null {
  if (prev == null || curr == null) return null;
  if (prev === 0) return curr === 0 ? 0 : null; // avoid div-by-zero; null = undefined direction
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/** Absolute difference. */
export function absChange(prev: number | null, curr: number | null): number | null {
  if (prev == null || curr == null) return null;
  return curr - prev;
}

/** Format a date in a client's timezone (defaults to UTC). */
export function formatDate(
  date: Date | string | null | undefined,
  timezone = "UTC",
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: timezone }).format(d);
}

/** Format minutes as "Xh Ym". */
export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Stable id for non-crypto uses. */
export function newId(prefix = ""): string {
  return prefix ? `${prefix}_${Math.random().toString(36).slice(2, 10)}` : Math.random().toString(36).slice(2, 10);
}
