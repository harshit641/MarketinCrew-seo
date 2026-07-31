import { getClient } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, EmptyState } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDate } from "@/lib/dates";
import { PenLine } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, any> = {
  PUBLISHED: "success", OPTIMIZING: "info", IN_PROGRESS: "warning",
  DECAYED: "danger", PLANNED: "neutral", IN_BRIEF: "neutral", IN_REVIEW: "info", REFRESHED: "success",
};

export default async function ClientContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const filter = await getClientFilter(user);
  const pages = await prisma.contentPage.findMany({
    where: { client: filter, clientId: client.id },
    orderBy: [{ lastUpdatedAt: "desc" }],
  });

  const columns: Column<(typeof pages)[number]>[] = [
    { key: "url", header: "URL", cell: (p) => <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{p.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 40) || "/"}</a> },
    { key: "keyword", header: "Primary keyword", cell: (p) => <span className="text-sm">{p.primaryKeyword ?? "—"}</span> },
    { key: "status", header: "Status", cell: (p) => <Badge tone={STATUS_TONE[p.contentStatus] ?? "neutral"}>{p.contentStatus.replace("_", " ")}</Badge> },
    { key: "words", header: "Words", align: "right", cell: (p) => <span className="text-sm">{p.wordCount ?? "—"}</span> },
    { key: "updated", header: "Updated", cell: (p) => <span className="text-sm text-muted-foreground">{p.lastUpdatedAt ? fmtDate(p.lastUpdatedAt) : "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Content & On-Page" description="Landing pages and content optimization tracking." />

      {pages.length === 0 ? (
        <EmptyState icon={<PenLine className="h-8 w-8" />} title="No content pages tracked" description="Track landing pages, content status and on-page optimization here." />
      ) : (
        <Card>
          <CardHeader><CardTitle>Tracked Pages ({pages.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} rows={pages} rowKey={(p) => p.id} empty="No pages." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
