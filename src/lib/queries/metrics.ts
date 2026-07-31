import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";
import { startOfDay } from "@/lib/dates";

/**
 * ===========================================================================
   Aggregation queries for dashboards and comparison cards. All scoped.
   Each returns raw aggregates + a dataSource label so the UI can always show
   where the numbers came from.
   ===========================================================================
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export async function clientScopedWhere(user: SessionUser): Promise<Prisma.ClientWhereInput> {
  return getClientFilter(user);
}

/** Daily GSC totals for a set of clients within a date range. */
export async function gscDailyTotals(
  user: SessionUser,
  range: DateRange,
  clientId?: string,
) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.SearchConsoleSnapshotWhereInput = {
    date: { gte: startOfDay(range.start), lte: range.end },
    client: clientFilter,
  };
  if (clientId) where.clientId = clientId;

  const rows = await prisma.searchConsoleSnapshot.groupBy({
    by: ["date"],
    where,
    _sum: { clicks: true, impressions: true },
    _avg: { ctr: true, position: true },
    orderBy: { date: "asc" },
  });

  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    clicks: r._sum.clicks ?? 0,
    impressions: r._sum.impressions ?? 0,
    ctr: +(r._avg.ctr ?? 0).toFixed(4),
    position: r._avg.position ? +r._avg.position.toFixed(1) : null,
  }));
}

/** Sums GSC metrics over a date range (for comparison cards). */
export async function gscRangeSummary(user: SessionUser, range: DateRange, clientId?: string) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.SearchConsoleSnapshotWhereInput = {
    date: { gte: startOfDay(range.start), lte: range.end },
    client: clientFilter,
  };
  if (clientId) where.clientId = clientId;

  const agg = await prisma.searchConsoleSnapshot.aggregate({
    where,
    _sum: { clicks: true, impressions: true },
    _avg: { ctr: true, position: true },
  });
  return {
    clicks: agg._sum.clicks ?? 0,
    impressions: agg._sum.impressions ?? 0,
    ctr: agg._avg.ctr ?? 0,
    position: agg._avg.position ?? null,
    dataSource: "Google Search Console",
  };
}

/** Daily GA4 organic totals within a date range. */
export async function analyticsDailyTotals(
  user: SessionUser,
  range: DateRange,
  clientId?: string,
) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.AnalyticsSnapshotWhereInput = {
    date: { gte: startOfDay(range.start), lte: range.end },
    client: clientFilter,
  };
  if (clientId) where.clientId = clientId;

  const rows = await prisma.analyticsSnapshot.groupBy({
    by: ["date"],
    where,
    _sum: { sessions: true, users: true, conversions: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    sessions: r._sum.sessions ?? 0,
    users: r._sum.users ?? 0,
    conversions: r._sum.conversions ?? 0,
  }));
}

export async function analyticsRangeSummary(user: SessionUser, range: DateRange, clientId?: string) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.AnalyticsSnapshotWhereInput = {
    date: { gte: startOfDay(range.start), lte: range.end },
    client: clientFilter,
  };
  if (clientId) where.clientId = clientId;
  const agg = await prisma.analyticsSnapshot.aggregate({
    where,
    _sum: { sessions: true, users: true, newUsers: true, conversions: true, revenue: true },
  });
  return {
    sessions: agg._sum.sessions ?? 0,
    users: agg._sum.users ?? 0,
    newUsers: agg._sum.newUsers ?? 0,
    conversions: agg._sum.conversions ?? 0,
    revenue: agg._sum.revenue ?? 0,
    dataSource: "Google Analytics 4",
  };
}

/**
 * Ranking distribution + winners/losers for a client at two comparison dates.
 * position 101 = "Not in top 100". change = previous - current (positive = up).
 */
export async function rankingComparison(
  user: SessionUser,
  clientId: string,
  currentDate: Date,
  previousDate: Date,
) {
  const clientFilter = await getClientFilter(user);
  // Verify the requested client is within the user's scope (defense in depth).
  const allowed = await prisma.client.findFirst({
    where: { id: clientId, ...clientFilter },
    select: { id: true },
  });
  if (!allowed) {
    const { ForbiddenError } = await import("@/lib/auth/session");
    throw new ForbiddenError("Client not in scope.");
  }
  const baseWhere: Prisma.KeywordSnapshotWhereInput = { clientId };

  // Latest snapshot on or before each date, per keyword.
  const [currentSnaps, prevSnaps] = await Promise.all([
    prisma.keywordSnapshot.findMany({
      where: { ...baseWhere, date: { lte: currentDate } },
      orderBy: [{ keywordId: "asc" }, { date: "desc" }],
      distinct: ["keywordId"],
      include: { keyword: true },
    }),
    prisma.keywordSnapshot.findMany({
      where: { ...baseWhere, date: { lte: previousDate } },
      orderBy: [{ keywordId: "asc" }, { date: "desc" }],
      distinct: ["keywordId"],
      include: { keyword: true },
    }),
  ]);

  const prevMap = new Map(prevSnaps.map((s) => [s.keywordId, s]));

  const keywords = currentSnaps.map((cur) => {
    const prev = prevMap.get(cur.keywordId);
    const currentPos = cur.position;
    const previousPos = prev?.position ?? null;
    const change = previousPos != null ? previousPos - currentPos : null; // positive = improved
    return {
      keywordId: cur.keywordId,
      keyword: cur.keyword.keyword,
      rankingUrl: cur.rankingUrl,
      currentPos,
      previousPos,
      change,
      isBrand: cur.keyword.isBrand,
    };
  });

  const buckets = { top3: 0, top10: 0, top20: 0, top50: 0, top100: 0, beyond: 0 };
  for (const k of keywords) {
    if (k.currentPos <= 3) buckets.top3++;
    if (k.currentPos <= 10) buckets.top10++;
    else if (k.currentPos <= 20) buckets.top20++;
    else if (k.currentPos <= 50) buckets.top50++;
    else if (k.currentPos <= 100) buckets.top100++;
    else buckets.beyond++;
  }

  const improved = keywords.filter((k) => (k.change ?? 0) > 0);
  const declined = keywords.filter((k) => (k.change ?? 0) < 0);
  const unchanged = keywords.filter((k) => k.change === 0);

  const avgPos = keywords.length
    ? +(keywords.reduce((a, k) => a + Math.min(k.currentPos, 100), 0) / keywords.length).toFixed(1)
    : null;

  return {
    keywords: keywords.sort((a, b) => a.currentPos - b.currentPos),
    buckets,
    totals: {
      tracked: keywords.length,
      top3: buckets.top3,
      top10: buckets.top10,
      top20: buckets.top20,
      improved: improved.length,
      declined: declined.length,
      unchanged: unchanged.length,
      avgPosition: avgPos,
    },
    winners: [...improved].sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, 10),
    losers: [...declined].sort((a, b) => (a.change ?? 0) - (b.change ?? 0)).slice(0, 10),
  };
}

/** Top queries from GSC for a client. */
export async function topGscQueries(user: SessionUser, clientId: string, range: DateRange, limit = 15) {
  const clientFilter = await getClientFilter(user);
  const rows = await prisma.searchConsoleSnapshot.groupBy({
    by: ["query"],
    where: {
      client: clientFilter,
      clientId,
      date: { gte: startOfDay(range.start), lte: range.end },
      query: { not: null },
    },
    _sum: { clicks: true, impressions: true },
    _avg: { ctr: true, position: true },
    orderBy: { _sum: { clicks: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({
    query: r.query ?? "(not set)",
    clicks: r._sum.clicks ?? 0,
    impressions: r._sum.impressions ?? 0,
    ctr: +(r._avg.ctr ?? 0).toFixed(4),
    position: r._avg.position ? +r._avg.position.toFixed(1) : null,
  }));
}

/** Top landing pages from GSC for a client. */
export async function topGscPages(user: SessionUser, clientId: string, range: DateRange, limit = 15) {
  const clientFilter = await getClientFilter(user);
  const rows = await prisma.searchConsoleSnapshot.groupBy({
    by: ["page"],
    where: {
      client: clientFilter,
      clientId,
      date: { gte: startOfDay(range.start), lte: range.end },
      page: { not: null },
    },
    _sum: { clicks: true, impressions: true },
    _avg: { ctr: true, position: true },
    orderBy: { _sum: { clicks: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({
    page: r.page ?? "(not set)",
    clicks: r._sum.clicks ?? 0,
    impressions: r._sum.impressions ?? 0,
    ctr: +(r._avg.ctr ?? 0).toFixed(4),
    position: r._avg.position ? +r._avg.position.toFixed(1) : null,
  }));
}
