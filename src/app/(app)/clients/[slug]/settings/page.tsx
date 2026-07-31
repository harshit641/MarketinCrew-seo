import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClient } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge } from "@/components/ui";
import { ClientForm } from "../../client-form";
import { TeamAssignmentManager } from "./team-manager";
import { DeleteClientButton } from "./delete-button";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) notFound();

  const canUpdate = hasPermission(user.role, PERMISSIONS.UPDATE_CLIENT);
  const canAssign = hasPermission(user.role, PERMISSIONS.ASSIGN_TEAM);
  const canDelete = hasPermission(user.role, PERMISSIONS.DELETE_CLIENT);

  // Staff available for assignment
  const staff = await prisma.employee.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Client settings" description={`Manage ${client.name}.`} />

      {canAssign && (
        <Card>
          <CardHeader>
            <CardTitle>Team assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamAssignmentManager
              clientId={client.id}
              assignments={client.assignments.map((a) => ({ employeeId: a.employeeId, userId: a.employee.userId, name: a.employee.user.name, role: a.role }))}
              staff={staff.map((s) => ({ id: s.id, name: s.user.name }))}
            />
          </CardContent>
        </Card>
      )}

      {canUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm mode="edit" client={client} />
          </CardContent>
        </Card>
      )}

      {canDelete && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Soft-deletes this client. Historical data and audit logs are preserved, but the client
              will no longer appear in lists or reports. This action is recorded in the audit log.
            </p>
            <DeleteClientButton clientId={client.id} clientName={client.name} />
          </CardContent>
        </Card>
      )}

      {!canUpdate && !canAssign && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You have view-only access to this client.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
