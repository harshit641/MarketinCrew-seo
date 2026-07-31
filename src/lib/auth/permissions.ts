import { SystemRole } from "@/generated/prisma/enums";

/**
 * ===========================================================================
 * RBAC: fine-grained permissions + role -> permission mapping.
 *
 * Permissions are checked SERVER-SIDE in every data access function. The UI
 * also hides navigation/actions the user cannot perform, but that is a
 * convenience layer only — the server is the source of truth.
 * ===========================================================================
 */

export const PERMISSIONS = {
  // Agency-wide
  VIEW_AGENCY_OVERVIEW: "view_agency_overview",
  MANAGE_TEAM: "manage_team",
  MANAGE_INTEGRATIONS: "manage_integrations",
  MANAGE_BRANDING: "manage_branding",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  VIEW_FINANCIALS: "view_financials",
  EXPORT_ALL_DATA: "export_all_data",

  // Clients
  VIEW_ALL_CLIENTS: "view_all_clients",
  VIEW_ASSIGNED_CLIENTS: "view_assigned_clients",
  CREATE_CLIENT: "create_client",
  UPDATE_CLIENT: "update_client",
  DELETE_CLIENT: "delete_client",
  ASSIGN_TEAM: "assign_team",

  // Tasks
  VIEW_TASKS: "view_tasks",
  CREATE_TASK: "create_task",
  UPDATE_TASK: "update_task",
  DELETE_TASK: "delete_task",
  APPROVE_TASK: "approve_task",

  // Work logs
  VIEW_WORKLOGS: "view_worklogs",
  SUBMIT_WORKLOG: "submit_worklog",
  APPROVE_WORKLOG: "approve_worklog",
  EDIT_APPROVED_WORKLOG: "edit_approved_worklog",

  // Keywords / rankings
  VIEW_KEYWORDS: "view_keywords",
  IMPORT_KEYWORDS: "import_keywords",
  DELETE_KEYWORD: "delete_keyword",

  // Backlinks
  VIEW_BACKLINKS: "view_backlinks",
  IMPORT_BACKLINKS: "import_backlinks",
  DELETE_BACKLINK: "delete_backlink",

  // Reports
  VIEW_REPORTS: "view_reports",
  CREATE_REPORT: "create_report",
  APPROVE_REPORT: "approve_report",
  DOWNLOAD_REPORT: "download_report",
  DELIVER_REPORT: "deliver_report",

  // Performance
  VIEW_TEAM_PERFORMANCE: "view_team_performance",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL: Permission[] = Object.values(PERMISSIONS);

/**
 * Role -> permission map. SUPER_ADMIN gets everything. Managers get client
 * operations scoped to assigned clients. Executives get their own logs/tasks.
 * Client viewers get a narrow portal-only set.
 */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.SUPER_ADMIN]: ALL,

  [SystemRole.SEO_MANAGER]: [
    PERMISSIONS.VIEW_AGENCY_OVERVIEW,
    PERMISSIONS.VIEW_ASSIGNED_CLIENTS,
    PERMISSIONS.UPDATE_CLIENT,
    PERMISSIONS.ASSIGN_TEAM,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.UPDATE_TASK,
    PERMISSIONS.APPROVE_TASK,
    PERMISSIONS.VIEW_WORKLOGS,
    PERMISSIONS.APPROVE_WORKLOG,
    PERMISSIONS.EDIT_APPROVED_WORKLOG,
    PERMISSIONS.VIEW_KEYWORDS,
    PERMISSIONS.IMPORT_KEYWORDS,
    PERMISSIONS.VIEW_BACKLINKS,
    PERMISSIONS.IMPORT_BACKLINKS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.APPROVE_REPORT,
    PERMISSIONS.DOWNLOAD_REPORT,
    PERMISSIONS.DELIVER_REPORT,
    PERMISSIONS.VIEW_TEAM_PERFORMANCE,
  ],

  [SystemRole.SEO_EXECUTIVE]: [
    PERMISSIONS.VIEW_ASSIGNED_CLIENTS,
    PERMISSIONS.CREATE_CLIENT,
    PERMISSIONS.UPDATE_CLIENT,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.UPDATE_TASK,
    PERMISSIONS.VIEW_WORKLOGS,
    PERMISSIONS.SUBMIT_WORKLOG,
    PERMISSIONS.VIEW_KEYWORDS,
    PERMISSIONS.IMPORT_KEYWORDS,
    PERMISSIONS.VIEW_BACKLINKS,
    PERMISSIONS.IMPORT_BACKLINKS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.DOWNLOAD_REPORT,
  ],

  [SystemRole.INTERN]: [
    // Interns: can view assigned clients, log work, create/update tasks, AND
    // add client data (keywords, rankings, backlinks, analytics, fixes) —
    // since they help populate the reports. They cannot create/edit clients,
    // approve work, or deliver reports.
    PERMISSIONS.VIEW_ASSIGNED_CLIENTS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.UPDATE_TASK,
    PERMISSIONS.VIEW_WORKLOGS,
    PERMISSIONS.SUBMIT_WORKLOG,
    PERMISSIONS.VIEW_KEYWORDS,
    PERMISSIONS.IMPORT_KEYWORDS,
    PERMISSIONS.VIEW_BACKLINKS,
    PERMISSIONS.IMPORT_BACKLINKS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.DOWNLOAD_REPORT,
  ],

  [SystemRole.CLIENT_VIEWER]: [
    // Portal: only their own client's approved data
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.DOWNLOAD_REPORT,
  ],
};

export function hasPermission(role: SystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: SystemRole, perms: Permission[]): boolean {
  return perms.some((p) => hasPermission(role, p));
}

export function isStaff(role: SystemRole): boolean {
  return (
    role === SystemRole.SUPER_ADMIN ||
    role === SystemRole.SEO_MANAGER ||
    role === SystemRole.SEO_EXECUTIVE ||
    role === SystemRole.INTERN
  );
}
