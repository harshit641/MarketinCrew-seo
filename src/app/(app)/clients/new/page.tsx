import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { PageHeader, Button } from "@/components/ui";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!hasPermission(user.role, PERMISSIONS.CREATE_CLIENT)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Not permitted" description="You don't have permission to create clients." />
        <Button asChild variant="outline" size="sm"><Link href="/clients"><ArrowLeft className="h-4 w-4" /> Back to clients</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/clients"><ArrowLeft className="h-4 w-4" /> Back to clients</Link></Button>
      <PageHeader title="Add client" description="Create a new SEO client profile." />
      <ClientForm mode="create" />
    </div>
  );
}
