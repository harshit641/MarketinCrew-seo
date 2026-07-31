import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { assembleReportData } from "@/lib/reports/data";
import { ReportPdfDocument } from "@/lib/reports/pdf-document";
import { fmtRange } from "@/lib/dates";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filter = await getClientFilter(user);
  const report = await prisma.report.findFirst({
    where: { id, client: filter },
    include: { client: { select: { id: true, name: true, slug: true } } },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const spanMs = report.periodEnd.getTime() - report.periodStart.getTime();
  const data = await assembleReportData(
    user,
    report.client.id,
    { start: report.periodStart, end: report.periodEnd },
    { start: new Date(report.periodStart.getTime() - spanMs), end: report.periodStart },
    fmtRange(report.periodStart, report.periodEnd),
    "Previous period",
    report.includeApprovedOnly,
  );

  // Merge editable commentary onto the data object for the PDF.
  const pdfData = {
    ...data,
    executiveSummary: report.executiveSummary,
    keyWins: report.keyWins,
    issuesRisks: report.issuesRisks,
    recommendations: report.recommendations,
    nextMonthPlan: report.nextMonthPlan,
  };

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });

  const pdf = await renderToBuffer(
    <ReportPdfDocument
      data={pdfData}
      title={report.title}
      footer={org?.reportFooter ?? undefined}
    />,
  );

  await recordAudit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "report.download_pdf",
    entityType: "report",
    entityId: report.id,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${report.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
