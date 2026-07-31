"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/(auth)/actions";
import { ReportType, ReportStatus, ReportSectionType } from "@/generated/prisma/enums";
import { nanoid } from "nanoid";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

const createSchema = z.object({
  clientId: z.string().min(1, "Select a client."),
  title: z.string().min(2, "Title is required."),
  type: z.nativeEnum(ReportType).default(ReportType.MONTHLY),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  isClientFacing: z.coerce.boolean().default(true),
  includeApprovedOnly: z.coerce.boolean().default(true),
});

const DEFAULT_SECTIONS: { type: ReportSectionType; title: string }[] = [
  { type: ReportSectionType.COVER, title: "Cover" },
  { type: ReportSectionType.REPORTING_PERIOD, title: "Reporting Period" },
  { type: ReportSectionType.EXECUTIVE_SUMMARY, title: "Executive Summary" },
  { type: ReportSectionType.KEY_KPI, title: "Key SEO KPIs" },
  { type: ReportSectionType.ORGANIC_SEARCH_CONSOLE, title: "Organic Clicks & Impressions" },
  { type: ReportSectionType.ORGANIC_ANALYTICS, title: "Organic Traffic & Conversions" },
  { type: ReportSectionType.KEYWORD_RANKING_SUMMARY, title: "Keyword Ranking Summary" },
  { type: ReportSectionType.RANKING_DISTRIBUTION, title: "Ranking Distribution" },
  { type: ReportSectionType.TOP_RANKING_IMPROVEMENTS, title: "Top Ranking Improvements" },
  { type: ReportSectionType.BACKLINK_SUMMARY, title: "Backlink Summary" },
  { type: ReportSectionType.TECHNICAL_SEO_SUMMARY, title: "Technical SEO Summary" },
  { type: ReportSectionType.TASKS_COMPLETED, title: "Tasks Completed" },
  { type: ReportSectionType.WORK_BY_CATEGORY, title: "Work Completed by Category" },
  { type: ReportSectionType.KEY_WINS, title: "Key Wins" },
  { type: ReportSectionType.ISSUES_RISKS, title: "Issues & Risks" },
  { type: ReportSectionType.RECOMMENDATIONS, title: "Recommendations" },
  { type: ReportSectionType.NEXT_MONTH_PLAN, title: "Next Month's Plan" },
  { type: ReportSectionType.METHODOLOGY, title: "Methodology & Data Sources" },
];

export async function createReportAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.CREATE_REPORT)) return err("Not permitted to create reports.");

  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: d.clientId, ...filter } });
  if (!client) return err("Client not found.");

  const periodStart = new Date(d.periodStart);
  const periodEnd = new Date(d.periodEnd);
  if (periodEnd < periodStart) return err("End date must be after start date.");

  const report = await prisma.report.create({
    data: {
      clientId: d.clientId,
      title: d.title,
      type: d.type,
      status: ReportStatus.DRAFT,
      periodStart,
      periodEnd,
      createdById: user.id,
      isClientFacing: d.isClientFacing,
      includeApprovedOnly: d.includeApprovedOnly,
      sections: {
        create: DEFAULT_SECTIONS.map((s, i) => ({ ...s, order: i })),
      },
    },
  });

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "report.create",
    entityType: "report", entityId: report.id, newValue: { title: report.title },
  });
  revalidatePath("/reports");
  revalidatePath(`/clients/${client.slug}/reports`);
  return ok({ id: report.id });
}

export async function updateReportContentAction(
  reportId: string,
  patch: {
    executiveSummary?: string;
    keyWins?: string;
    issuesRisks?: string;
    recommendations?: string;
    nextMonthPlan?: string;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.CREATE_REPORT)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const report = await prisma.report.findFirst({ where: { id: reportId, client: filter } });
  if (!report) return err("Report not found.");

  await prisma.report.update({ where: { id: reportId }, data: patch });
  revalidatePath(`/reports/${reportId}`);
  return ok(undefined);
}

export async function updateSectionCommentaryAction(
  sectionId: string,
  commentary: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.CREATE_REPORT)) return err("Not permitted.");

  await prisma.reportSection.update({ where: { id: sectionId }, data: { commentary } });
  return ok(undefined);
}

export async function toggleSectionAction(sectionId: string, enabled: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.CREATE_REPORT)) return err("Not permitted.");
  await prisma.reportSection.update({ where: { id: sectionId }, data: { isEnabled: enabled } });
  revalidatePath("/reports/[id]");
  return ok(undefined);
}

export async function approveReportAction(reportId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.APPROVE_REPORT)) return err("Not permitted to approve reports.");

  const filter = await getClientFilter(user);
  const report = await prisma.report.findFirst({ where: { id: reportId, client: filter }, include: { client: true } });
  if (!report) return err("Report not found.");

  await prisma.report.update({
    where: { id: reportId },
    data: { status: ReportStatus.APPROVED, approvedById: user.id, approvedAt: new Date() },
  });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "report.approve",
    entityType: "report", entityId: reportId,
  });
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/clients/${report.client.slug}/reports`);
  return ok(undefined);
}

export async function deliverReportAction(reportId: string): Promise<ActionResult<{ shareUrl: string }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.DELIVER_REPORT)) return err("Not permitted to deliver reports.");

  const filter = await getClientFilter(user);
  const report = await prisma.report.findFirst({ where: { id: reportId, client: filter }, include: { client: true } });
  if (!report) return err("Report not found.");

  const shareToken = report.shareToken ?? nanoid(24);
  await prisma.report.update({
    where: { id: reportId },
    data: { status: ReportStatus.DELIVERED, shareToken, publishedAt: new Date() },
  });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "report.deliver",
    entityType: "report", entityId: reportId,
  });
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/clients/${report.client.slug}/reports`);
  return ok({ shareUrl: `/reports/shared/${shareToken}` });
}

export async function deleteReportAction(reportId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.APPROVE_REPORT)) return err("Not permitted.");
  const filter = await getClientFilter(user);
  const report = await prisma.report.findFirst({ where: { id: reportId, client: filter } });
  if (!report) return err("Report not found.");
  await prisma.report.delete({ where: { id: reportId } });
  revalidatePath("/reports");
  return ok(undefined);
}
