import Link from "next/link";
import { Building2, Plus, Globe, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { listClients } from "@/lib/queries";
import { Card, CardContent, Badge, PageHeader, Button, EmptyState } from "@/components/ui";
import { contractTone, ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { q } = await searchParams;
  const clients = await listClients(user, { search: q });
  const canCreate = hasPermission(user.role, PERMISSIONS.CREATE_CLIENT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="All clients you have access to."
        actions={
          canCreate && (
            <Button asChild size="sm">
              <Link href="/clients/new"><Plus className="h-4 w-4" /> Add client</Link>
            </Button>
          )
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={q ? "No clients match your search" : "No clients yet"}
          description={q ? "Try a different search term." : "Create your first SEO client to begin tracking work, rankings and reporting."}
          action={canCreate && !q ? <Button asChild size="sm"><Link href="/clients/new">Add client</Link></Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar text-sm font-semibold text-white">
                        {c.name[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-tight">{c.name}</p>
                        {c.primaryDomain && (
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" /> {c.primaryDomain}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge tone={contractTone(c.contractStatus)}>{c.contractStatus}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{c._count.tasks} open tasks</span>
                    <span>{c._count.keywords} keywords</span>
                    {c.industry && <span className="truncate">{c.industry}</span>}
                  </div>

                  {c.assignments.length > 0 && (
                    <div className="flex items-center gap-1.5 border-t border-border pt-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="truncate text-xs text-muted-foreground">
                        {c.assignments
                          .map((a) => `${a.employee.user.name} (${ROLE_LABELS[a.role].replace("SEO ", "")})`)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
