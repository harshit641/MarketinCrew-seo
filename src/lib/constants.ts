import {
  SystemRole,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  WorkLogStatus,
  ApprovalStatus,
  ContractStatus,
  ReportStatus,
  IssueSeverity,
  IssueStatus,
  BacklinkStatus,
  LinkType,
  IntegrationProvider,
  IntegrationStatus,
} from "@/generated/prisma/enums";
import type { BadgeProps } from "@/components/ui";

/* Human-readable labels for enums used across the UI. */

export const ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.SUPER_ADMIN]: "Super Admin",
  [SystemRole.SEO_MANAGER]: "SEO Manager",
  [SystemRole.SEO_EXECUTIVE]: "SEO Executive",
  [SystemRole.INTERN]: "Intern",
  [SystemRole.CLIENT_VIEWER]: "Client Viewer",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: "Backlog",
  [TaskStatus.TODO]: "To Do",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.IN_REVIEW]: "In Review",
  [TaskStatus.AWAITING_APPROVAL]: "Awaiting Approval",
  [TaskStatus.DONE]: "Done",
  [TaskStatus.BLOCKED]: "Blocked",
  [TaskStatus.CANCELLED]: "Cancelled",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "Low",
  [TaskPriority.MEDIUM]: "Medium",
  [TaskPriority.HIGH]: "High",
  [TaskPriority.URGENT]: "Urgent",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  [TaskCategory.TECHNICAL_SEO]: "Technical SEO",
  [TaskCategory.ON_PAGE_SEO]: "On-Page SEO",
  [TaskCategory.KEYWORD_RESEARCH]: "Keyword Research",
  [TaskCategory.CONTENT_STRATEGY]: "Content Strategy",
  [TaskCategory.CONTENT_WRITING]: "Content Writing",
  [TaskCategory.CONTENT_OPTIMIZATION]: "Content Optimization",
  [TaskCategory.INTERNAL_LINKING]: "Internal Linking",
  [TaskCategory.BACKLINK_BUILDING]: "Backlink Building",
  [TaskCategory.BACKLINK_AUDIT]: "Backlink Audit",
  [TaskCategory.LOCAL_SEO]: "Local SEO",
  [TaskCategory.GOOGLE_BUSINESS_PROFILE]: "Google Business Profile",
  [TaskCategory.SCHEMA_MARKUP]: "Schema Markup",
  [TaskCategory.INDEXING]: "Indexing",
  [TaskCategory.COMPETITOR_RESEARCH]: "Competitor Research",
  [TaskCategory.SEARCH_CONSOLE_ANALYSIS]: "Search Console Analysis",
  [TaskCategory.ANALYTICS_ANALYSIS]: "Analytics Analysis",
  [TaskCategory.REPORTING]: "Reporting",
  [TaskCategory.CLIENT_COMMUNICATION]: "Client Communication",
  [TaskCategory.WEBSITE_IMPLEMENTATION]: "Website Implementation",
  [TaskCategory.AI_SEARCH_VISIBILITY]: "AI Search Visibility",
  [TaskCategory.OTHER]: "Other",
};

export const WORKLOG_STATUS_LABELS: Record<WorkLogStatus, string> = {
  [WorkLogStatus.COMPLETED]: "Completed",
  [WorkLogStatus.ONGOING]: "Ongoing",
  [WorkLogStatus.BLOCKED]: "Blocked",
  [WorkLogStatus.AWAITING_APPROVAL]: "Awaiting Approval",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: "Pending",
  [ApprovalStatus.APPROVED]: "Approved",
  [ApprovalStatus.REJECTED]: "Rejected",
  [ApprovalStatus.CHANGES_REQUESTED]: "Changes Requested",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.ACTIVE]: "Active",
  [ContractStatus.PAUSED]: "Paused",
  [ContractStatus.ENDED]: "Ended",
  [ContractStatus.PROSPECT]: "Prospect",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.DRAFT]: "Draft",
  [ReportStatus.IN_REVIEW]: "In Review",
  [ReportStatus.APPROVED]: "Approved",
  [ReportStatus.DELIVERED]: "Delivered",
  [ReportStatus.SCHEDULED]: "Scheduled",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  [IssueSeverity.CRITICAL]: "Critical",
  [IssueSeverity.HIGH]: "High",
  [IssueSeverity.MEDIUM]: "Medium",
  [IssueSeverity.LOW]: "Low",
  [IssueSeverity.INFO]: "Info",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  [IssueStatus.OPEN]: "Open",
  [IssueStatus.IN_PROGRESS]: "In Progress",
  [IssueStatus.RESOLVED]: "Resolved",
  [IssueStatus.IGNORED]: "Ignored",
};

export const BACKLINK_STATUS_LABELS: Record<BacklinkStatus, string> = {
  [BacklinkStatus.LIVE]: "Live",
  [BacklinkStatus.LOST]: "Lost",
  [BacklinkStatus.BROKEN]: "Broken",
  [BacklinkStatus.PENDING]: "Pending",
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  [LinkType.DOFOLLOW]: "Dofollow",
  [LinkType.NOFOLLOW]: "Nofollow",
  [LinkType.SPONSORED]: "Sponsored",
  [LinkType.UGC]: "UGC",
};

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  [IntegrationProvider.GOOGLE_SEARCH_CONSOLE]: "Google Search Console",
  [IntegrationProvider.GA4]: "Google Analytics 4",
  [IntegrationProvider.DATAFORSEO]: "DataForSEO",
  [IntegrationProvider.AHREFS]: "Ahrefs",
  [IntegrationProvider.SEMRUSH]: "Semrush",
  [IntegrationProvider.PAGESPEED]: "PageSpeed Insights",
  [IntegrationProvider.SCREAMING_FROG]: "Screaming Frog",
  [IntegrationProvider.MANUAL]: "Manual / CSV",
  [IntegrationProvider.DEMO]: "Demo (mock data)",
};

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  [IntegrationStatus.CONNECTED]: "Connected",
  [IntegrationStatus.DISCONNECTED]: "Disconnected",
  [IntegrationStatus.ERROR]: "Error",
  [IntegrationStatus.EXPIRED]: "Expired",
  [IntegrationStatus.NEVER_CONNECTED]: "Never Connected",
};

/* Tone mappings for badges. */

export function approvalTone(s: ApprovalStatus): BadgeProps["tone"] {
  switch (s) {
    case ApprovalStatus.APPROVED:
      return "success";
    case ApprovalStatus.REJECTED:
      return "danger";
    case ApprovalStatus.CHANGES_REQUESTED:
      return "warning";
    default:
      return "neutral";
  }
}

export function taskStatusTone(s: TaskStatus): BadgeProps["tone"] {
  switch (s) {
    case TaskStatus.DONE:
      return "success";
    case TaskStatus.IN_PROGRESS:
    case TaskStatus.IN_REVIEW:
      return "info";
    case TaskStatus.AWAITING_APPROVAL:
      return "warning";
    case TaskStatus.BLOCKED:
      return "danger";
    case TaskStatus.CANCELLED:
      return "neutral";
    default:
      return "neutral";
  }
}

export function contractTone(s: ContractStatus): BadgeProps["tone"] {
  switch (s) {
    case ContractStatus.ACTIVE:
      return "success";
    case ContractStatus.PAUSED:
      return "warning";
    case ContractStatus.ENDED:
      return "danger";
    default:
      return "neutral";
  }
}

export function integrationTone(s: IntegrationStatus): BadgeProps["tone"] {
  switch (s) {
    case IntegrationStatus.CONNECTED:
      return "success";
    case IntegrationStatus.DISCONNECTED:
    case IntegrationStatus.EXPIRED:
      return "warning";
    case IntegrationStatus.ERROR:
      return "danger";
    default:
      return "neutral";
  }
}

export function severityTone(s: IssueSeverity): BadgeProps["tone"] {
  switch (s) {
    case IssueSeverity.CRITICAL:
    case IssueSeverity.HIGH:
      return "danger";
    case IssueSeverity.MEDIUM:
      return "warning";
    case IssueSeverity.LOW:
      return "info";
    default:
      return "neutral";
  }
}
