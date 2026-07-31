import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getClient } from "@/lib/queries";
import {
  gscRangeSummary,
  analyticsRangeSummary,
  rankingComparison,
  topGscQueries,
  topGscPages,
  type DateRange,
} from "@/lib/queries/metrics";
import type { SessionUser } from "@/lib/auth/session";

/**
 * ===========================================================================
   Report data assembly. Given a client + period, gathers every dataset a
   report section might need in one pass. Only APPROVED work logs and DONE
   tasks within the period are included in the completed-work section, per the
   reporting rules (unless overridden by a manager).
   ===========================================================================
 */

export interface ReportData {
  client: Awaited<ReturnType<typeof getClient>>;
  period: DateRange;
  periodLabel: string;
  previousPeriod: DateRange;
  previousPeriodLabel: string;
  gsc: { current: any; previous: any };
  analytics: { current: any; previous: any };
  ranking: Awaited<ReturnType<typeof rankingComparison>>;
  topQueries: any[];
  topPages: any[];
  backlinks: { live: number; lost: number; newThisPeriod: any[]; lostThisPeriod: any[] };
  technical: { open: number; critical: number; resolved: number; recent: any[] };
  completedTasks: any[];
  workLogs: any[];
  workByCategory: { category: string; minutes: number; count: number }[];
  pageSpeed: any[];
  goals: any[];
  // Editable commentary (merged in by callers from the report record).
  executiveSummary?: string | null;
  keyWins?: string | null;
  issuesRisks?: string | null;
  recommendations?: string | null;
  nextMonthPlan?: string | null;
}

export async function assembleReportData(
  user: SessionUser,
  clientId: string,
  period: DateRange,
  previousPeriod: DateRange,
  periodLabel: string,
  previousPeriodLabel: string,
  includeApprovedOnly: boolean,
): Promise<ReportData> {
  const client = await getClient(user, clientId);
  if (!client) throw new Error("Client not found");

  const now = new Date();
  const ranking = await rankingComparison(user, clientId, now, previousPeriod.start);

  const [gscCur, gscPrev, gaCur, gaPrev, topQueries, topPages, backlinks, techIssues, tasks, workLogs, pageSpeed] = await Promise.all([
    gscRangeSummary(user, period, clientId),
    gscRangeSummary(user, previousPeriod, clientId),
    analyticsRangeSummary(user, period, clientId),
    analyticsRangeSummary(user, previousPeriod, clientId),
    topGscQueries(user, clientId, period, 10),
    topGscPages(user, clientId, period, 10),
    prisma.backlink.findMany({
      where: {
        clientId,
        OR: [
          { acquiredAt: { gte: period.start, lte: period.end } },
          { lostAt: { gte: period.start, lte: period.end } },
        ],
      },
      orderBy: { acquiredAt: "desc" },
    }),
    prisma.technicalIssue.findMany({
      where: { clientId, OR: [{ firstSeenAt: { gte: period.start, lte: period.end } }, { resolvedAt: { gte: period.start, lte: period.end } }, { status: "OPEN" }] },
      orderBy: { lastSeenAt: "desc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: {
        clientId, deletedAt: null,
        OR: [{ status: "DONE", completedAt: { gte: period.start, lte: period.end } }],
      },
      include: { assignee: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.workLog.findMany({
      where: {
        clientId,
        date: { gte: period.start, lte: period.end },
        ...(includeApprovedOnly ? { approvalStatus: "APPROVED" } : {}),
        isDraft: false,
      },
      include: {
        items: true,
        employee: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.pageSpeedSnapshot.findMany({
      where: { clientId, date: { gte: period.start, lte: period.end } },
      orderBy: { date: "desc" },
      take: 4,
    }),
  ]);

  // Aggregate work by category
  const catMap = new Map<string, { minutes: number; count: number }>();
  for (const wl of workLogs) {
    for (const item of wl.items) {
      const cur = catMap.get(item.category) ?? { minutes: 0, count: 0 };
      cur.minutes += item.minutesSpent;
      cur.count += 1;
      catMap.set(item.category, cur);
    }
  }
  const workByCategory = [...catMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.minutes - a.minutes);

  const newBl = backlinks.filter((b) => b.acquiredAt && b.acquiredAt >= period.start && b.acquiredAt <= period.end && b.status === "LIVE");
  const lostBl = backlinks.filter((b) => b.lostAt && b.lostAt >= period.start && b.lostAt <= period.end);

  return {
    client,
    period,
    periodLabel,
    previousPeriod,
    previousPeriodLabel,
    gsc: { current: gscCur, previous: gscPrev },
    analytics: { current: gaCur, previous: gaPrev },
    ranking,
    topQueries,
    topPages,
    backlinks: {
      live: await prisma.backlink.count({ where: { clientId, status: "LIVE" } }),
      lost: await prisma.backlink.count({ where: { clientId, status: "LOST" } }),
      newThisPeriod: newBl,
      lostThisPeriod: lostBl,
    },
    technical: {
      open: techIssues.filter((i) => i.status === "OPEN").length,
      critical: techIssues.filter((i) => i.status === "OPEN" && (i.severity === "CRITICAL" || i.severity === "HIGH")).length,
      resolved: techIssues.filter((i) => i.status === "RESOLVED").length,
      recent: techIssues.slice(0, 10),
    },
    completedTasks: tasks,
    workLogs,
    workByCategory,
    pageSpeed,
    goals: client?.goals ?? [],
  };
}

// re-export for type usage in PDF / page
export type { SessionUser };
