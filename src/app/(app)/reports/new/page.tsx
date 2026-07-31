import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Button, Card, CardContent, Field, Input, Select, Label } from "@/components/ui";
import { createReportAction } from "../actions";
import { ReportType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!hasPermission(user.role, PERMISSIONS.CREATE_REPORT)) {
    return <div className="space-y-4"><PageHeader title="Not permitted" description="You cannot create reports." /><Button asChild variant="outline" size="sm"><Link href="/reports"><ArrowLeft className="h-4 w-4" /> Back</Link></Button></div>;
  }
  const { client: defaultClientId } = await searchParams;
  const filter = await getClientFilter(user);
  const clients = await prisma.client.findMany({ where: filter, select: { id: true, name: true }, orderBy: { name: "asc" } });

  // Default to last month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const toInput = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/reports"><ArrowLeft className="h-4 w-4" /> Back to reports</Link></Button>
      <PageHeader title="New report" description="Create a report. You can edit commentary and sections next." />
      <Card>
        <CardContent className="p-6">
          <form action={async (fd: FormData) => { await createReportAction(undefined, fd); }} className="space-y-4">
            <Field label="Client *">
              <Select name="clientId" defaultValue={defaultClientId} required>
                <option value="">Select a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Report title *">
              <Input name="title" placeholder="e.g. Monthly SEO Report — July 2026" required />
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue={ReportType.MONTHLY}>
                <option value={ReportType.MONTHLY}>Monthly</option>
                <option value={ReportType.WEEKLY}>Weekly</option>
                <option value={ReportType.QUARTERLY}>Quarterly</option>
                <option value={ReportType.CUSTOM}>Custom date range</option>
                <option value={ReportType.INTERNAL}>Internal</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Period start *"><Input name="periodStart" type="date" defaultValue={toInput(monthStart)} required /></Field>
              <Field label="Period end *"><Input name="periodEnd" type="date" defaultValue={toInput(monthEnd)} required /></Field>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isClientFacing" defaultChecked className="h-4 w-4 rounded border-border" />
                Client-facing report
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="includeApprovedOnly" defaultChecked className="h-4 w-4 rounded border-border" />
                Include only approved work logs &amp; completed tasks
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
              <Button type="submit">Create report</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
