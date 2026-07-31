import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getClient } from "@/lib/queries";
import { listWorkLogs } from "@/lib/queries/worklogs";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Button, Badge, EmptyState } from "@/components/ui";
import { APPROVAL_STATUS_LABELS, TASK_CATEGORY_LABELS, approvalTone } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientWorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = await getClient(user, slug);
  if (!client) return null;

  const logs = await listWorkLogs(user, { clientId: client.id });
  // A daily log can span multiple clients. Filter each log's items down to the
  // ones that belong to THIS client: an item belongs here if its own clientId
  // matches, or (if it has none) the parent WorkLog's clientId matches.
  const visibleLogs = logs
    .map((l) => ({
      ...l,
      items: l.items.filter((it) => it.clientId === client.id || (!it.clientId && l.clientId === client.id)),
    }))
    .filter((l) => l.items.length > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Work Completed"
        description="All daily work-log activity for this client."
        actions={
          hasPermission(user.role, PERMISSIONS.SUBMIT_WORKLOG) && (
            <Button asChild size="sm">
              <Link href={`/work-logs/new?client=${client.id}`}><Plus className="h-4 w-4" /> New log</Link>
            </Button>
          )
        }
      />

      {visibleLogs.length === 0 ? (
        <EmptyState
          title="No work logged yet"
          description="Daily work logs for this client will appear here automatically as the team submits them."
          action={hasPermission(user.role, PERMISSIONS.SUBMIT_WORKLOG) ? <Button asChild size="sm"><Link href={`/work-logs/new?client=${client.id}`}>New log</Link></Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {visibleLogs.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {l.employee?.user?.name?.[0] ?? "?"}
                    </span>
                    <span className="text-sm font-medium">{l.employee?.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(l.date)}</span>
                  </div>
                  <Badge tone={approvalTone(l.approvalStatus)}>{APPROVAL_STATUS_LABELS[l.approvalStatus]}</Badge>
                </div>
                <ul className="space-y-2">
                  {l.items.map((it) => (
                    <li key={it.id} className="border-l-2 border-border pl-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{TASK_CATEGORY_LABELS[it.category]}</Badge>
                        <span className="text-xs text-muted-foreground">{formatMinutes(it.minutesSpent)}</span>
                      </div>
                      <p className="mt-0.5 text-sm">{it.workCompleted}</p>
                      {it.clientVisibleSummary && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">Client-facing: {it.clientVisibleSummary}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
