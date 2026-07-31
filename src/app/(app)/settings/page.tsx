import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, Field, Input, Button, Label } from "@/components/ui";
import { brandingFormAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const canManage = hasPermission(user.role, PERMISSIONS.MANAGE_BRANDING);

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Agency branding and system configuration." />

      {canManage ? (
        <Card>
          <CardContent className="p-6">
            <form action={brandingFormAction} className="space-y-4">
              <Field label="Agency name"><Input name="name" defaultValue={org?.name} required /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary color" hint="Sidebar / dark accent"><Input name="primaryColor" defaultValue={org?.primaryColor ?? "#0f172a"} /></Field>
                <Field label="Secondary color" hint="Buttons / links"><Input name="secondaryColor" defaultValue={org?.secondaryColor ?? "#2563eb"} /></Field>
              </div>
              <Field label="Report footer text"><Input name="reportFooter" defaultValue={org?.reportFooter ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Support email"><Input name="supportEmail" type="email" defaultValue={org?.supportEmail ?? ""} /></Field>
                <Field label="Email sender name"><Input name="emailSenderName" defaultValue={org?.emailSenderName ?? ""} /></Field>
              </div>
              <Field label="Client portal domain"><Input name="portalDomain" defaultValue={org?.portalDomain ?? ""} /></Field>
              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit">Save settings</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Only Super Admins can change settings.</CardContent></Card>
      )}
    </div>
  );
}
