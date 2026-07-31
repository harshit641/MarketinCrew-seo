"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { SystemRole } from "@/generated/prisma/enums";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export interface SidebarUser {
  name: string;
  email: string;
  role: SystemRole;
}

export function Sidebar({ user, mobile = false }: { user: SidebarUser; mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">MarketinCrew</p>
          <p className="text-[11px] text-sidebar-muted">SEO Command Center</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter(
            (item) =>
              !item.permission ||
              (hasPermission(user.role, item.permission) &&
                !item.excludeRoles?.includes(user.role)),
          );
          if (items.length === 0) return null;
          return (
            <div key={gi} className="mb-4">
              {group.title && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActive(pathname, item.href)} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/agency") return pathname === "/agency";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
