import Link from "next/link";
import { PenLine } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { PageHeader, Card, CardContent, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ContentOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const filter = await getClientFilter(user);

  const clients = await prisma.client.findMany({
    where: filter,
    select: { id: true, name: true, slug: true, _count: { select: { contentPages: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Content & On-Page" description="Landing-page and content management across clients." />
      <Card>
        <CardContent className="space-y-2 pt-5">
          {clients.length === 0 ? (
            <EmptyState icon={<PenLine className="h-8 w-8" />} title="No clients" />
          ) : (
            clients.map((c) => (
              <Link key={c.id} href={`/clients/${c.slug}/content`} className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/40">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c._count.contentPages} pages</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
