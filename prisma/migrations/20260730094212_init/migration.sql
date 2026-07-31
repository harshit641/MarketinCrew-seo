-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'SEO_MANAGER', 'SEO_EXECUTIVE', 'CLIENT_VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED', 'PROSPECT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'AWAITING_APPROVAL', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('TECHNICAL_SEO', 'ON_PAGE_SEO', 'KEYWORD_RESEARCH', 'CONTENT_STRATEGY', 'CONTENT_WRITING', 'CONTENT_OPTIMIZATION', 'INTERNAL_LINKING', 'BACKLINK_BUILDING', 'BACKLINK_AUDIT', 'LOCAL_SEO', 'GOOGLE_BUSINESS_PROFILE', 'SCHEMA_MARKUP', 'INDEXING', 'COMPETITOR_RESEARCH', 'SEARCH_CONSOLE_ANALYSIS', 'ANALYTICS_ANALYSIS', 'REPORTING', 'CLIENT_COMMUNICATION', 'WEBSITE_IMPLEMENTATION', 'AI_SEARCH_VISIBILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkLogStatus" AS ENUM ('COMPLETED', 'ONGOING', 'BLOCKED', 'AWAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "KeywordTrackingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SearchIntent" AS ENUM ('INFORMATIONAL', 'NAVIGATIONAL', 'COMMERCIAL', 'TRANSACTIONAL');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('DOFOLLOW', 'NOFOLLOW', 'SPONSORED', 'UGC');

-- CreateEnum
CREATE TYPE "BacklinkStatus" AS ENUM ('LIVE', 'LOST', 'BROKEN', 'PENDING');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MONTHLY', 'WEEKLY', 'QUARTERLY', 'CUSTOM', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'DELIVERED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ReportSectionType" AS ENUM ('COVER', 'REPORTING_PERIOD', 'EXECUTIVE_SUMMARY', 'GOALS_PROGRESS', 'KEY_KPI', 'ORGANIC_SEARCH_CONSOLE', 'ORGANIC_ANALYTICS', 'KEYWORD_RANKING_SUMMARY', 'RANKING_DISTRIBUTION', 'TOP_RANKING_IMPROVEMENTS', 'RANKING_DECLINES', 'LANDING_PAGE_PERFORMANCE', 'BACKLINK_SUMMARY', 'TECHNICAL_SEO_SUMMARY', 'CONTENT_SUMMARY', 'TASKS_COMPLETED', 'WORK_BY_CATEGORY', 'KEY_WINS', 'ISSUES_RISKS', 'RECOMMENDATIONS', 'NEXT_MONTH_PLAN', 'METHODOLOGY');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('INCREASE_ORGANIC_CLICKS', 'INCREASE_ORGANIC_CONVERSIONS', 'IMPROVE_TOP10_KEYWORDS', 'IMPROVE_LOCAL_VISIBILITY', 'INCREASE_NON_BRANDED_TRAFFIC', 'INCREASE_REFERRING_DOMAINS', 'RESOLVE_INDEXING', 'IMPROVE_CORE_WEB_VITALS', 'PUBLISH_OPTIMIZE_PAGES', 'IMPROVE_PRODUCT_SERVICE_LOCATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'ACHIEVED', 'BEHIND', 'NOT_STARTED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('RANKING_DECLINE', 'CLICK_DECLINE', 'TRAFFIC_DECLINE', 'CONVERSION_DECLINE', 'INDEXING_FAILURE', 'LOST_BACKLINK', 'BROKEN_BACKLINK', 'TECHNICAL_DECLINE', 'SYNC_FAILURE', 'INTEGRATION_DISCONNECTED', 'OVERDUE_TASK', 'MISSING_WORKLOG', 'REPORT_DUE', 'REPORT_AWAITING_APPROVAL', 'GOAL_AT_RISK');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_SEARCH_CONSOLE', 'GA4', 'DATAFORSEO', 'AHREFS', 'SEMRUSH', 'PAGESPEED', 'SCREAMING_FROG', 'MANUAL', 'DEMO');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED', 'NEVER_CONNECTED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'RUNNING');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('LANDING_PAGE', 'BLOG_POST', 'PRODUCT_PAGE', 'SERVICE_PAGE', 'CATEGORY_PAGE', 'HOMEPAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PLANNED', 'IN_BRIEF', 'IN_PROGRESS', 'IN_REVIEW', 'PUBLISHED', 'OPTIMIZING', 'REFRESHED', 'DECAYED');

-- CreateEnum
CREATE TYPE "Device" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "secondaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "reportFooter" TEXT,
    "supportEmail" TEXT,
    "portalDomain" TEXT,
    "emailSenderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "SystemRole" NOT NULL DEFAULT 'SEO_EXECUTIVE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "jobTitle" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weeklyCapacityMinutes" INTEGER NOT NULL DEFAULT 1800,
    "hireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startDate" TIMESTAMP(3),
    "contractStatus" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "servicePackage" TEXT,
    "monthlyReportDay" INTEGER NOT NULL DEFAULT 1,
    "primaryContact" TEXT,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "primaryDomain" TEXT,
    "additionalDomains" TEXT[],
    "targetLocations" TEXT[],
    "targetLanguages" TEXT[],
    "trackingDevicePreference" "Device" NOT NULL DEFAULT 'DESKTOP',
    "competitorDomains" TEXT[],
    "reportingCurrency" TEXT NOT NULL DEFAULT 'USD',
    "reportingPreferences" JSONB,
    "clientGoalsText" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL DEFAULT 'SEO_EXECUTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMember" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientGoal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "title" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdById" TEXT NOT NULL,
    "ownerId" TEXT,
    "assigneeId" TEXT,
    "assigneeEmployeeId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "actualApprovedMinutes" INTEGER DEFAULT 0,
    "complexityPoints" INTEGER NOT NULL DEFAULT 1,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "relatedUrl" TEXT,
    "relatedKeyword" TEXT,
    "relatedKeywordGroupId" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "templateSourceId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "blockingTaskId" TEXT NOT NULL,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "tasksJson" JSONB NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "WorkLogStatus" NOT NULL DEFAULT 'COMPLETED',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "billableMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLogItem" (
    "id" TEXT NOT NULL,
    "workLogId" TEXT NOT NULL,
    "taskId" TEXT,
    "category" "TaskCategory" NOT NULL,
    "workCompleted" TEXT NOT NULL,
    "deliverable" TEXT,
    "urlWorkedOn" TEXT,
    "keywordWorkedOn" TEXT,
    "minutesSpent" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkLogStatus" NOT NULL DEFAULT 'COMPLETED',
    "evidenceUrl" TEXT,
    "blocker" TEXT,
    "nextAction" TEXT,
    "internalNote" TEXT,
    "clientVisibleSummary" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkLogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLogApproval" (
    "id" TEXT NOT NULL,
    "workLogId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLogApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordGroup" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "keywordGroupId" TEXT,
    "searchIntent" "SearchIntent",
    "targetUrl" TEXT,
    "rankingUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "city" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "device" "Device" NOT NULL DEFAULT 'DESKTOP',
    "searchEngine" TEXT NOT NULL DEFAULT 'google',
    "isBrand" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DOUBLE PRECISION,
    "baselinePosition" INTEGER,
    "currentPosition" INTEGER,
    "previousPosition" INTEGER,
    "bestPosition" INTEGER,
    "trackingStatus" "KeywordTrackingStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "tags" TEXT[],
    "notes" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordSnapshot" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "position" INTEGER NOT NULL,
    "rankingUrl" TEXT,
    "searchEngine" TEXT NOT NULL DEFAULT 'google',
    "device" "Device" NOT NULL DEFAULT 'DESKTOP',
    "location" TEXT,
    "serpFeatures" TEXT[],
    "localPackPosition" INTEGER,
    "dataProvider" "IntegrationProvider" NOT NULL DEFAULT 'MANUAL',
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorKeywordSnapshot" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "position" INTEGER,
    "visibilityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorKeywordSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchConsoleSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "query" TEXT,
    "page" TEXT,
    "country" TEXT,
    "device" TEXT,
    "searchAppearance" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION,
    "isBranded" BOOLEAN,
    "dataProvider" "IntegrationProvider" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchConsoleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "engagedSessions" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "avgEngagementTimeSec" DOUBLE PRECISION,
    "pageviews" INTEGER,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "transactions" INTEGER,
    "device" TEXT,
    "country" TEXT,
    "city" TEXT,
    "sourceMedium" TEXT,
    "dataProvider" "IntegrationProvider" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "dataProvider" "IntegrationProvider" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backlink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT,
    "linkType" "LinkType" NOT NULL DEFAULT 'DOFOLLOW',
    "firstSeenAt" TIMESTAMP(3),
    "acquiredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "status" "BacklinkStatus" NOT NULL DEFAULT 'LIVE',
    "httpStatus" INTEGER,
    "domainRating" INTEGER,
    "urlRating" INTEGER,
    "spamRisk" INTEGER,
    "referringDomain" TEXT,
    "trafficEstimate" INTEGER,
    "country" TEXT,
    "linkBuildingMethod" TEXT,
    "ownerId" TEXT,
    "vendor" TEXT,
    "cost" DOUBLE PRECISION,
    "campaign" TEXT,
    "evidence" TEXT,
    "notes" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Backlink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkCheck" (
    "id" TEXT NOT NULL,
    "backlinkId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLive" BOOLEAN NOT NULL,
    "httpStatus" INTEGER,
    "linkType" "LinkType",
    "error" TEXT,

    CONSTRAINT "BacklinkCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalIssue" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "recommendedFix" TEXT,
    "assignedToId" TEXT,
    "taskId" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "source" "IntegrationProvider" NOT NULL DEFAULT 'MANUAL',
    "evidence" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageSpeedSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "device" "Device" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "performance" INTEGER,
    "accessibility" INTEGER,
    "bestPractices" INTEGER,
    "seo" INTEGER,
    "lcp" DOUBLE PRECISION,
    "inp" DOUBLE PRECISION,
    "cls" DOUBLE PRECISION,
    "fcp" DOUBLE PRECISION,
    "speedIndex" DOUBLE PRECISION,
    "tbt" DOUBLE PRECISION,
    "dataProvider" "IntegrationProvider" NOT NULL DEFAULT 'PAGESPEED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageSpeedSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" "ContentType" NOT NULL DEFAULT 'LANDING_PAGE',
    "primaryKeywordId" TEXT,
    "primaryKeyword" TEXT,
    "secondaryKeywords" TEXT[],
    "searchIntent" "SearchIntent",
    "currentTitle" TEXT,
    "proposedTitle" TEXT,
    "currentMetaDescription" TEXT,
    "proposedMetaDescription" TEXT,
    "h1" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'PLANNED',
    "wordCount" INTEGER,
    "contentOwnerId" TEXT,
    "optimizationOwnerId" TEXT,
    "publishDate" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),
    "internalLinksAdded" INTEGER NOT NULL DEFAULT 0,
    "schemaType" TEXT,
    "indexingStatus" TEXT,
    "baselineClicks" INTEGER,
    "currentClicks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTask" (
    "id" TEXT NOT NULL,
    "contentPageId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'MONTHLY',
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executiveSummary" TEXT,
    "keyWins" TEXT,
    "issuesRisks" TEXT,
    "recommendations" TEXT,
    "nextMonthPlan" TEXT,
    "isClientFacing" BOOLEAN NOT NULL DEFAULT true,
    "includeApprovedOnly" BOOLEAN NOT NULL DEFAULT true,
    "shareToken" TEXT,
    "sharePasswordHash" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSection" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "ReportSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentary" TEXT,
    "config" JSONB,

    CONSTRAINT "ReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportVersion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "category" "AlertCategory" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "threshold" DOUBLE PRECISION,
    "channel" TEXT NOT NULL DEFAULT 'in_app,email',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "category" "AlertCategory" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientIntegration" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "label" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NEVER_CONNECTED',
    "config" JSONB,
    "encryptedCredentials" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "apiUsageCount" INTEGER NOT NULL DEFAULT 0,
    "apiUsageLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "syncJobId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taskId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "taskId" TEXT,
    "workLogId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "taskId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Client_organizationId_deletedAt_idx" ON "Client"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Client_contractStatus_idx" ON "Client"("contractStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_slug_key" ON "Client"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "ClientAssignment_clientId_idx" ON "ClientAssignment"("clientId");

-- CreateIndex
CREATE INDEX "ClientAssignment_employeeId_idx" ON "ClientAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssignment_clientId_employeeId_key" ON "ClientAssignment"("clientId", "employeeId");

-- CreateIndex
CREATE INDEX "ClientMember_userId_idx" ON "ClientMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMember_clientId_userId_key" ON "ClientMember"("clientId", "userId");

-- CreateIndex
CREATE INDEX "ClientGoal_clientId_status_idx" ON "ClientGoal"("clientId", "status");

-- CreateIndex
CREATE INDEX "Task_clientId_status_deletedAt_idx" ON "Task"("clientId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- CreateIndex
CREATE INDEX "Task_approvalStatus_idx" ON "Task"("approvalStatus");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_taskId_idx" ON "TaskChecklistItem"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_blockingTaskId_key" ON "TaskDependency"("taskId", "blockingTaskId");

-- CreateIndex
CREATE INDEX "TaskTemplate_organizationId_idx" ON "TaskTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "WorkLog_clientId_date_idx" ON "WorkLog"("clientId", "date");

-- CreateIndex
CREATE INDEX "WorkLog_employeeId_date_idx" ON "WorkLog"("employeeId", "date");

-- CreateIndex
CREATE INDEX "WorkLog_approvalStatus_idx" ON "WorkLog"("approvalStatus");

-- CreateIndex
CREATE INDEX "WorkLog_userId_idx" ON "WorkLog"("userId");

-- CreateIndex
CREATE INDEX "WorkLogItem_workLogId_idx" ON "WorkLogItem"("workLogId");

-- CreateIndex
CREATE INDEX "WorkLogItem_taskId_idx" ON "WorkLogItem"("taskId");

-- CreateIndex
CREATE INDEX "WorkLogItem_category_idx" ON "WorkLogItem"("category");

-- CreateIndex
CREATE INDEX "WorkLogApproval_workLogId_idx" ON "WorkLogApproval"("workLogId");

-- CreateIndex
CREATE INDEX "WorkLogApproval_approverId_idx" ON "WorkLogApproval"("approverId");

-- CreateIndex
CREATE INDEX "KeywordGroup_clientId_idx" ON "KeywordGroup"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordGroup_clientId_name_key" ON "KeywordGroup"("clientId", "name");

-- CreateIndex
CREATE INDEX "Keyword_clientId_trackingStatus_idx" ON "Keyword"("clientId", "trackingStatus");

-- CreateIndex
CREATE INDEX "Keyword_keywordGroupId_idx" ON "Keyword"("keywordGroupId");

-- CreateIndex
CREATE INDEX "Keyword_isBrand_idx" ON "Keyword"("isBrand");

-- CreateIndex
CREATE INDEX "Keyword_currentPosition_idx" ON "Keyword"("currentPosition");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_clientId_keyword_country_city_device_searchEngine_key" ON "Keyword"("clientId", "keyword", "country", "city", "device", "searchEngine");

-- CreateIndex
CREATE INDEX "KeywordSnapshot_keywordId_date_idx" ON "KeywordSnapshot"("keywordId", "date");

-- CreateIndex
CREATE INDEX "KeywordSnapshot_clientId_date_idx" ON "KeywordSnapshot"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordSnapshot_keywordId_date_device_searchEngine_location_key" ON "KeywordSnapshot"("keywordId", "date", "device", "searchEngine", "location");

-- CreateIndex
CREATE INDEX "Competitor_clientId_idx" ON "Competitor"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_clientId_domain_key" ON "Competitor"("clientId", "domain");

-- CreateIndex
CREATE INDEX "CompetitorKeywordSnapshot_competitorId_date_idx" ON "CompetitorKeywordSnapshot"("competitorId", "date");

-- CreateIndex
CREATE INDEX "CompetitorKeywordSnapshot_keywordId_date_idx" ON "CompetitorKeywordSnapshot"("keywordId", "date");

-- CreateIndex
CREATE INDEX "SearchConsoleSnapshot_clientId_date_idx" ON "SearchConsoleSnapshot"("clientId", "date");

-- CreateIndex
CREATE INDEX "SearchConsoleSnapshot_clientId_query_idx" ON "SearchConsoleSnapshot"("clientId", "query");

-- CreateIndex
CREATE INDEX "SearchConsoleSnapshot_clientId_page_idx" ON "SearchConsoleSnapshot"("clientId", "page");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_clientId_date_idx" ON "AnalyticsSnapshot"("clientId", "date");

-- CreateIndex
CREATE INDEX "LandingPageSnapshot_clientId_date_idx" ON "LandingPageSnapshot"("clientId", "date");

-- CreateIndex
CREATE INDEX "LandingPageSnapshot_clientId_page_idx" ON "LandingPageSnapshot"("clientId", "page");

-- CreateIndex
CREATE INDEX "Backlink_clientId_status_idx" ON "Backlink"("clientId", "status");

-- CreateIndex
CREATE INDEX "Backlink_sourceDomain_idx" ON "Backlink"("sourceDomain");

-- CreateIndex
CREATE INDEX "Backlink_targetUrl_idx" ON "Backlink"("targetUrl");

-- CreateIndex
CREATE INDEX "Backlink_acquiredAt_idx" ON "Backlink"("acquiredAt");

-- CreateIndex
CREATE INDEX "BacklinkCheck_backlinkId_checkedAt_idx" ON "BacklinkCheck"("backlinkId", "checkedAt");

-- CreateIndex
CREATE INDEX "TechnicalIssue_clientId_status_severity_idx" ON "TechnicalIssue"("clientId", "status", "severity");

-- CreateIndex
CREATE INDEX "TechnicalIssue_clientId_url_idx" ON "TechnicalIssue"("clientId", "url");

-- CreateIndex
CREATE INDEX "PageSpeedSnapshot_clientId_url_device_date_idx" ON "PageSpeedSnapshot"("clientId", "url", "device", "date");

-- CreateIndex
CREATE INDEX "ContentPage_clientId_contentStatus_idx" ON "ContentPage"("clientId", "contentStatus");

-- CreateIndex
CREATE INDEX "ContentPage_clientId_url_idx" ON "ContentPage"("clientId", "url");

-- CreateIndex
CREATE INDEX "ContentTask_contentPageId_idx" ON "ContentTask"("contentPageId");

-- CreateIndex
CREATE INDEX "ContentTask_clientId_idx" ON "ContentTask"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_shareToken_key" ON "Report"("shareToken");

-- CreateIndex
CREATE INDEX "Report_clientId_status_idx" ON "Report"("clientId", "status");

-- CreateIndex
CREATE INDEX "Report_createdById_idx" ON "Report"("createdById");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ReportSection_reportId_order_idx" ON "ReportSection"("reportId", "order");

-- CreateIndex
CREATE INDEX "ReportVersion_reportId_version_idx" ON "ReportVersion"("reportId", "version");

-- CreateIndex
CREATE INDEX "AlertRule_organizationId_isEnabled_idx" ON "AlertRule"("organizationId", "isEnabled");

-- CreateIndex
CREATE INDEX "AlertRule_clientId_idx" ON "AlertRule"("clientId");

-- CreateIndex
CREATE INDEX "AlertEvent_clientId_status_idx" ON "AlertEvent"("clientId", "status");

-- CreateIndex
CREATE INDEX "AlertEvent_category_status_idx" ON "AlertEvent"("category", "status");

-- CreateIndex
CREATE INDEX "AlertEvent_createdAt_idx" ON "AlertEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "ClientIntegration_clientId_status_idx" ON "ClientIntegration"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientIntegration_clientId_provider_key" ON "ClientIntegration"("clientId", "provider");

-- CreateIndex
CREATE INDEX "SyncJob_provider_status_idx" ON "SyncJob"("provider", "status");

-- CreateIndex
CREATE INDEX "SyncJob_integrationId_idx" ON "SyncJob"("integrationId");

-- CreateIndex
CREATE INDEX "SyncLog_syncJobId_createdAt_idx" ON "SyncLog"("syncJobId", "createdAt");

-- CreateIndex
CREATE INDEX "Annotation_clientId_date_idx" ON "Annotation"("clientId", "date");

-- CreateIndex
CREATE INDEX "Attachment_clientId_idx" ON "Attachment"("clientId");

-- CreateIndex
CREATE INDEX "Attachment_taskId_idx" ON "Attachment"("taskId");

-- CreateIndex
CREATE INDEX "Attachment_workLogId_idx" ON "Attachment"("workLogId");

-- CreateIndex
CREATE INDEX "Comment_taskId_idx" ON "Comment"("taskId");

-- CreateIndex
CREATE INDEX "Comment_clientId_idx" ON "Comment"("clientId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMember" ADD CONSTRAINT "ClientMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMember" ADD CONSTRAINT "ClientMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGoal" ADD CONSTRAINT "ClientGoal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeEmployeeId_fkey" FOREIGN KEY ("assigneeEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogItem" ADD CONSTRAINT "WorkLogItem_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "WorkLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogItem" ADD CONSTRAINT "WorkLogItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogApproval" ADD CONSTRAINT "WorkLogApproval_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "WorkLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogApproval" ADD CONSTRAINT "WorkLogApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordGroup" ADD CONSTRAINT "KeywordGroup_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_keywordGroupId_fkey" FOREIGN KEY ("keywordGroupId") REFERENCES "KeywordGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordSnapshot" ADD CONSTRAINT "KeywordSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorKeywordSnapshot" ADD CONSTRAINT "CompetitorKeywordSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorKeywordSnapshot" ADD CONSTRAINT "CompetitorKeywordSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchConsoleSnapshot" ADD CONSTRAINT "SearchConsoleSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageSnapshot" ADD CONSTRAINT "LandingPageSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backlink" ADD CONSTRAINT "Backlink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backlink" ADD CONSTRAINT "Backlink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkCheck" ADD CONSTRAINT "BacklinkCheck_backlinkId_fkey" FOREIGN KEY ("backlinkId") REFERENCES "Backlink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalIssue" ADD CONSTRAINT "TechnicalIssue_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalIssue" ADD CONSTRAINT "TechnicalIssue_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageSpeedSnapshot" ADD CONSTRAINT "PageSpeedSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTask" ADD CONSTRAINT "ContentTask_contentPageId_fkey" FOREIGN KEY ("contentPageId") REFERENCES "ContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTask" ADD CONSTRAINT "ContentTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSection" ADD CONSTRAINT "ReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVersion" ADD CONSTRAINT "ReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientIntegration" ADD CONSTRAINT "ClientIntegration_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "WorkLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
