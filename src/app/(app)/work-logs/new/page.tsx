import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Button, Card, CardContent } from "@/components/ui";
import { WorkLogForm } from "../work-log-form";

export const dynamic = "force-dynamic";

export default async function NewWorkLogPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!hasPermission(user.role, PERMISSIONS.SUBMIT_WORKLOG)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Not permitted" description="You don't have permission to submit work logs." />
        <Button asChild variant="outline" size="sm"><Link href="/work-logs"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
      </div>
    );
  }

  const { client: defaultClientId } = await searchParams;
  const filter = await getClientFilter(user);
  const clients = await prisma.client.findMany({
    where: filter,
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  // Tasks for linking (optional)
  const tasks = defaultClientId
    ? await prisma.task.findMany({
        where: { clientId: defaultClientId, deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/work-logs"><ArrowLeft className="h-4 w-4" /> Back to work logs</Link></Button>
      <PageHeader
        title="New Daily Work Log"
        description="Record everything you worked on today. Add as many activities as needed."
      />
      <Card>
        <CardContent className="p-6">
          <WorkLogForm
            clients={clients}
            tasks={tasks}
            defaultClientId={defaultClientId}
            // Employee name is derived server-side from the session, never editable.
            employeeName={user.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
