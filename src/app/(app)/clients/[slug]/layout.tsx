import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClient } from "@/lib/queries";
import { ClientTabs } from "./client-tabs";
import { Badge, Button } from "@/components/ui";
import { contractTone } from "@/lib/constants";
import { isStaff } from "@/lib/auth/permissions";
import { SystemRole } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const client = await getClient(user, slug);
  if (!client) notFound();

  const basePath = `/clients/${client.slug}`;
  const staff = isStaff(user.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {staff && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/clients"><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-base font-semibold text-white">
            {client.name[0]}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{client.name}</h1>
              <Badge tone={contractTone(client.contractStatus)}>{client.contractStatus}</Badge>
              {client.isDemo && <Badge tone="info">Demo data</Badge>}
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-3 w-3" /> {client.primaryDomain ?? client.websiteUrl}
            </p>
          </div>
        </div>
      </div>

      <ClientTabs basePath={basePath} />

      <div>{children}</div>
    </div>
  );
}

// Re-export role enum for potential children use
export { SystemRole };
