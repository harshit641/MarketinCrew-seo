import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Button, Card, CardContent } from "@/components/ui";
import { TaskForm } from "../task-form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!hasPermission(user.role, PERMISSIONS.CREATE_TASK)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Not permitted" description="You don't have permission to create tasks." />
        <Button asChild variant="outline" size="sm"><Link href="/tasks"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
      </div>
    );
  }

  const { client: defaultClientId } = await searchParams;
  const filter = await getClientFilter(user);
  const [clients, staff] = await Promise.all([
    prisma.client.findMany({ where: filter, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/tasks"><ArrowLeft className="h-4 w-4" /> Back to tasks</Link></Button>
      <PageHeader title="New task" description="Create an SEO task and assign it to a team member." />
      <Card>
        <CardContent className="p-6">
          <TaskForm clients={clients} staff={staff.map((s) => ({ id: s.user.id, name: s.user.name }))} defaultClientId={defaultClientId} />
        </CardContent>
      </Card>
    </div>
  );
}
