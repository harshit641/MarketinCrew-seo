import "server-only";
import { prisma } from "@/lib/db";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";
import { resolvePreset } from "@/lib/dates";
import {
  gscRangeSummary,
  analyticsRangeSummary,
  rankingComparison,
} from "@/lib/queries/metrics";

/**
 * ===========================================================================
   AI Insights engine.

   IMPORTANT — this is a FACTUAL insights generator, not a free-form LLM. It
   derives every statement from real data and attaches the exact numbers, so
   it can never invent metrics or claim causation from timing alone.

   The output is structured (headline + bullets). When an LLM API key is
   configured (OPENAI_API_KEY / GEMINI_API_KEY), a later phase can pass these
   structured facts to the LLM to humanize the wording — but the facts stay
   grounded here, and human approval is always required before client delivery.
   ===========================================================================
 */

export interface Insight {
  type: "win" | "risk" | "opportunity" | "info";
  title: string;
  detail: string; // the factual sentence with real numbers
}

export interface ClientInsights {
  headline: string;
  periodLabel: string;
  insights: Insight[];
}

export async function generateClientInsights(
  user: SessionUser,
  clientId: string,
): Promise<ClientInsights> {
  const preset = resolvePreset("last28vsprev28");
  const [gscCur, gscPrev, gaCur, gaPrev, ranking, openTasks, lostBacklinks, criticalIssues] = await Promise.all([
    gscRangeSummary(user, preset.current, clientId),
    gscRangeSummary(user, preset.previous, clientId),
    analyticsRangeSummary(user, preset.current, clientId),
    analyticsRangeSummary(user, preset.previous, clientId),
    rankingComparison(user, clientId, new Date(), preset.previous.start),
    prisma.task.count({ where: { clientId, status: { notIn: ["DONE", "CANCELLED"] }, deletedAt: null } }),
    prisma.backlink.count({ where: { clientId, status: "LOST", lostAt: { gte: preset.previous.start } } }),
    prisma.technicalIssue.count({ where: { clientId, status: "OPEN", severity: { in: ["CRITICAL", "HIGH"] } } }),
  ]);

  const insights: Insight[] = [];
  const client = await prisma.client.findFirst({ where: { id: clientId }, select: { name: true } });

  // --- Clicks trend
  const clickPct = pct(gscPrev.clicks, gscCur.clicks);
  if (clickPct !== null) {
    if (clickPct >= 10) {
      insights.push({ type: "win", title: "Organic clicks growing", detail: `Organic clicks rose ${clickPct.toFixed(0)}% (${gscPrev.clicks.toLocaleString()} → ${gscCur.clicks.toLocaleString()}) in ${preset.currentLabel} vs ${preset.previousLabel}. Source: Google Search Console.` });
    } else if (clickPct <= -10) {
      insights.push({ type: "risk", title: "Organic clicks declining", detail: `Organic clicks fell ${Math.abs(clickPct).toFixed(0)}% (${gscPrev.clicks.toLocaleString()} → ${gscCur.clicks.toLocaleString()}) in ${preset.currentLabel} vs ${preset.previousLabel}. Source: Google Search Console.` });
    }
  }

  // --- Sessions trend
  const sessPct = pct(gaPrev.sessions, gaCur.sessions);
  if (sessPct !== null && Math.abs(sessPct) >= 10) {
    insights.push({
      type: sessPct > 0 ? "win" : "risk",
      title: sessPct > 0 ? "Organic sessions up" : "Organic sessions down",
      detail: `Organic sessions ${sessPct > 0 ? "increased" : "decreased"} ${Math.abs(sessPct).toFixed(0)}% (${gaPrev.sessions.toLocaleString()} → ${gaCur.sessions.toLocaleString()}). Source: GA4.`,
    });
  }

  // --- Ranking wins
  if (ranking.totals.improved > 0) {
    const top = ranking.winners[0];
    insights.push({
      type: "win",
      title: "Ranking improvements",
      detail: `${ranking.totals.improved} keyword${ranking.totals.improved === 1 ? "" : "s"} improved vs ${preset.previousLabel}. ${top ? `Best: "${top.keyword}" moved ${top.change} positions to #${top.currentPos}.` : ""} Source: exact SERP tracking.`,
    });
  }
  if (ranking.totals.declined > 0) {
    const worst = ranking.losers[0];
    insights.push({
      type: "risk",
      title: "Ranking declines",
      detail: `${ranking.totals.declined} keyword${ranking.totals.declined === 1 ? "" : "s"} declined. ${worst ? `Biggest drop: "${worst.keyword}" fell ${Math.abs(worst.change!)} positions to #${worst.currentPos}.` : ""} Source: exact SERP tracking.`,
    });
  }

  // --- Opportunities: keywords close to top 10
  const closeToTop10 = ranking.keywords.filter((k) => k.currentPos >= 11 && k.currentPos <= 15);
  if (closeToTop10.length > 0) {
    insights.push({
      type: "opportunity",
      title: "Keywords near page 1",
      detail: `${closeToTop10.length} keyword${closeToTop10.length === 1 ? " is" : "s are"} ranking #11-15 — close to breaking into the top 10. Prioritize: ${closeToTop10.slice(0, 3).map((k) => `"${k.keyword}" (#${k.currentPos})`).join(", ")}.`,
    });
  }

  // --- Lost backlinks
  if (lostBacklinks > 0) {
    insights.push({ type: "risk", title: "Lost backlinks", detail: `${lostBacklinks} backlink${lostBacklinks === 1 ? "" : "s"} were lost in this period. Consider reclaiming or replacing them.` });
  }

  // --- Technical issues
  if (criticalIssues > 0) {
    insights.push({ type: "risk", title: "Critical technical issues", detail: `${criticalIssues} open critical/high technical issue${criticalIssues === 1 ? "" : "s"} need attention.` });
  }

  // --- Workload
  if (openTasks > 0) {
    insights.push({ type: "info", title: "Open tasks", detail: `${openTasks} task${openTasks === 1 ? "" : "s"} currently open for this client.` });
  }

  // Headline = the single most important fact
  let headline = `${client?.name ?? "This client"}: ${preset.currentLabel} summary.`;
  const wins = insights.filter((i) => i.type === "win").length;
  const risks = insights.filter((i) => i.type === "risk").length;
  if (wins > risks) headline = `${client?.name ?? "Client"} is trending up — ${wins} positive signal${wins === 1 ? "" : "s"} this period.`;
  else if (risks > wins) headline = `${client?.name ?? "Client"} needs attention — ${risks} risk${risks === 1 ? "" : "s"} flagged this period.`;
  else if (insights.length === 0) headline = `${client?.name ?? "Client"}: no significant changes in ${preset.currentLabel}.`;

  return { headline, periodLabel: `${preset.currentLabel} vs ${preset.previousLabel}`, insights };
}

/** Team-wide insights: top performers, workload balance, attention needed. */
export interface TeamInsights {
  headline: string;
  insights: Insight[];
}

export async function generateTeamInsights(user: SessionUser): Promise<TeamInsights> {
  const filter = await getClientFilter(user);
  const insights: Insight[] = [];

  const [pendingLogs, overdueTasks, pendingReports, employees, clientPerf] = await Promise.all([
    prisma.workLog.count({ where: { client: filter, approvalStatus: "PENDING" } }),
    prisma.task.count({ where: { client: filter, status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { lt: new Date() }, deletedAt: null } }),
    prisma.report.count({ where: { client: filter, status: { in: ["DRAFT", "IN_REVIEW"] } } }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: { user: { select: { id: true, name: true, role: true } }, assignments: true },
    }),
    prisma.client.findMany({
      where: filter,
      select: { id: true, name: true, slug: true, contractStatus: true, _count: { select: { tasks: { where: { status: { not: "DONE" } } } } } },
    }),
  ]);

  if (pendingLogs > 0) {
    insights.push({ type: "risk", title: "Work logs awaiting approval", detail: `${pendingLogs} work log${pendingLogs === 1 ? "" : "s"} are pending manager approval. Approve promptly so work becomes report-eligible.` });
  }
  if (overdueTasks > 0) {
    insights.push({ type: "risk", title: "Overdue tasks", detail: `${overdueTasks} task${overdueTasks === 1 ? "" : "s"} are past their due date across all clients.` });
  }
  if (pendingReports > 0) {
    insights.push({ type: "info", title: "Reports in progress", detail: `${pendingReports} report${pendingReports === 1 ? "" : "s"} are drafted or in review.` });
  }

  // Workload balance
  const execs = employees.filter((e) => e.user.role === "SEO_EXECUTIVE" || e.user.role === "INTERN");
  if (execs.length > 0) {
    const loadings = await Promise.all(
      execs.map(async (e) => ({
        name: e.user.name,
        role: e.user.role,
        open: await prisma.task.count({ where: { assigneeEmployeeId: e.id, status: { notIn: ["DONE", "CANCELLED"] }, deletedAt: null, client: filter } }),
      })),
    );
    const max = loadings.reduce((a, b) => (b.open > a.open ? b : a), loadings[0]);
    const min = loadings.reduce((a, b) => (b.open < a.open ? b : a), loadings[0]);
    if (max && min && max.open - min.open >= 3) {
      insights.push({ type: "opportunity", title: "Workload imbalance", detail: `${max.name} has ${max.open} open tasks while ${min.name} has ${min.open}. Consider rebalancing.` });
    }
    // Top contributor (by completed tasks this month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const top = await Promise.all(
      execs.map(async (e) => ({ name: e.user.name, done: await prisma.task.count({ where: { assigneeEmployeeId: e.id, status: "DONE", completedAt: { gte: monthStart }, client: filter } }) })),
    );
    const topContributor = top.reduce((a, b) => (b.done > a.done ? b : a), top[0]);
    if (topContributor && topContributor.done > 0) {
      insights.push({ type: "win", title: "Top contributor this month", detail: `${topContributor.name} completed ${topContributor.done} task${topContributor.done === 1 ? "" : "s"} this month — the most on the team.` });
    }
  }

  // Clients needing attention
  const attention = clientPerf.filter((c) => c._count.tasks > 5);
  if (attention.length > 0) {
    insights.push({ type: "info", title: "High workload clients", detail: `${attention.map((c) => c.name).join(", ")} each have 5+ open tasks.` });
  }

  const headline = pendingLogs + overdueTasks > 0
    ? `${pendingLogs + overdueTasks} item${pendingLogs + overdueTasks === 1 ? "" : "s"} need attention across the team.`
    : "Team is on track — no critical items pending.";

  return { headline, insights };
}

function pct(prev: number, cur: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
