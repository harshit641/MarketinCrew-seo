import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  ClipboardList,
  TrendingUp,
  Search,
  BarChart3,
  Link2,
  Wrench,
  FileText,
  Users,
  Bell,
  Plug,
  Settings,
  History,
  PenLine,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SystemRole } from "@/generated/prisma/enums";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Roles that should NOT see this item. */
  excludeRoles?: SystemRole[];
}

/**
 * Sidebar groups. Items are filtered client-side by permission AND server-side
 * in the layout loader, so a client viewer never sees internal navigation.
 */
export const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Agency Overview", href: "/agency", icon: LayoutDashboard, permission: PERMISSIONS.VIEW_AGENCY_OVERVIEW, excludeRoles: [SystemRole.CLIENT_VIEWER, SystemRole.SEO_EXECUTIVE] },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Clients", href: "/clients", icon: Building2, permission: PERMISSIONS.VIEW_ASSIGNED_CLIENTS },
      { label: "Tasks", href: "/tasks", icon: ListChecks, permission: PERMISSIONS.VIEW_TASKS },
      { label: "Daily Work Logs", href: "/work-logs", icon: ClipboardList, permission: PERMISSIONS.VIEW_WORKLOGS, excludeRoles: [SystemRole.CLIENT_VIEWER] },
    ],
  },
  {
    title: "SEO Data",
    items: [
      { label: "Keyword Rankings", href: "/rankings", icon: TrendingUp, permission: PERMISSIONS.VIEW_KEYWORDS },
      { label: "Search Console", href: "/search-console", icon: Search, permission: PERMISSIONS.VIEW_KEYWORDS },
      { label: "Analytics", href: "/analytics", icon: BarChart3, permission: PERMISSIONS.VIEW_KEYWORDS },
      { label: "Backlinks", href: "/backlinks", icon: Link2, permission: PERMISSIONS.VIEW_BACKLINKS },
      { label: "Technical SEO", href: "/technical", icon: Wrench, permission: PERMISSIONS.VIEW_KEYWORDS },
      { label: "Content & On-Page", href: "/content", icon: PenLine, permission: PERMISSIONS.VIEW_KEYWORDS },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: FileText, permission: PERMISSIONS.VIEW_REPORTS },
      { label: "Team Performance", href: "/team", icon: Users, permission: PERMISSIONS.VIEW_TEAM_PERFORMANCE },
      { label: "Alerts", href: "/alerts", icon: Bell, permission: PERMISSIONS.VIEW_ASSIGNED_CLIENTS },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Integrations", href: "/integrations", icon: Plug, permission: PERMISSIONS.MANAGE_INTEGRATIONS },
      { label: "Settings", href: "/settings", icon: Settings, permission: PERMISSIONS.MANAGE_BRANDING },
      { label: "Audit Logs", href: "/audit-logs", icon: History, permission: PERMISSIONS.VIEW_AUDIT_LOGS },
    ],
  },
];
