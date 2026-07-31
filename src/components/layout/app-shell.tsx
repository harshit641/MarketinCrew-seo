import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, ListChecks } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    // ignore
  }

  if (!user) {
    redirect("/login");
  }

  const sidebarUser = { name: user.name, email: user.email, role: user.role };

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar user={sidebarUser} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={sidebarUser} />
        <div className="hidden items-center justify-between border-b border-border bg-card px-6 py-2 lg:flex">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>
            </p>
            {/* Quick actions — role-aware, so daily logging is one click away */}
            {hasPermission(user.role, PERMISSIONS.SUBMIT_WORKLOG) && (
              <Button asChild size="sm" variant="default" className="h-7 text-xs">
                <Link href="/work-logs/new"><ClipboardList className="h-3.5 w-3.5" /> Log today&apos;s work</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/tasks"><ListChecks className="h-3.5 w-3.5" /> My tasks</Link>
            </Button>
          </div>
          <UserMenu user={sidebarUser} />
        </div>
        <main className="flex-1 bg-background px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
