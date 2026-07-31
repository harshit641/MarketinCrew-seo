import "server-only";
import type { IntegrationProvider, Device } from "@/generated/prisma/enums";

/**
 * ===========================================================================
   Provider-adapter interfaces. External SEO providers can be swapped without
   rewriting the application — each capability is behind one of these
   interfaces. Concrete adapters live in ./adapters/*. The MVP ships a Demo
   adapter and CSV/manual import; live OAuth adapters (GSC, GA4, PageSpeed,
   DataForSEO, Ahrefs) are added in Phase 2+ behind feature flags.

   KEY RULE: every method returns a `dataSource` label. The UI MUST display it.
   Mock/demo data is always labelled and never presented as live client data.
   ===========================================================================
 */

export interface RankingSnapshotInput {
  keyword: string;
  date: Date;
  position: number; // 101 = not in top 100
  rankingUrl?: string | null;
  device: Device;
  location?: string | null;
  searchEngine?: string;
}

export interface RankTrackingProvider {
  readonly provider: IntegrationProvider;
  fetchRankings(opts: {
    keywords: string[];
    country: string;
    city?: string | null;
    device: Device;
    date: Date;
  }): Promise<{ snapshots: RankingSnapshotInput[]; dataSource: string }>;
}

export interface BacklinkInput {
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText?: string | null;
  linkType?: string;
  domainRating?: number | null;
  firstSeenAt?: Date | null;
}

export interface BacklinkProvider {
  readonly provider: IntegrationProvider;
  fetchBacklinks(opts: { domain: string; limit?: number }): Promise<{ backlinks: BacklinkInput[]; dataSource: string }>;
}

export interface TechnicalIssueInput {
  url: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  description?: string | null;
  recommendedFix?: string | null;
}

export interface TechnicalAuditProvider {
  readonly provider: IntegrationProvider;
  runAudit(opts: { domain: string }): Promise<{ issues: TechnicalIssueInput[]; dataSource: string }>;
}

export interface GscRow {
  date: Date;
  query?: string | null;
  page?: string | null;
  country?: string | null;
  device?: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number; // GSC average position — NOT exact SERP rank
}

export interface SearchConsoleProvider {
  readonly provider: IntegrationProvider;
  fetchPerformance(opts: { property: string; startDate: Date; endDate: Date }): Promise<{ rows: GscRow[]; dataSource: string }>;
}

export interface AnalyticsRow {
  date: Date;
  sessions: number;
  users: number;
  newUsers: number;
  conversions: number;
}

export interface AnalyticsProvider {
  readonly provider: IntegrationProvider;
  fetchOrganic(opts: { property: string; startDate: Date; endDate: Date }): Promise<{ rows: AnalyticsRow[]; dataSource: string }>;
}

export interface PageSpeedInput {
  url: string;
  device: Device;
  date: Date;
  performance: number;
  accessibility?: number | null;
  bestPractices?: number | null;
  seo?: number | null;
  lcp?: number | null;
  inp?: number | null;
  cls?: number | null;
}

export interface AIVisibilityProvider {
  readonly provider: IntegrationProvider;
  fetchVisibility(opts: { queries: string[] }): Promise<{ dataSource: string; rows: unknown[] }>;
}

/**
 * Registry resolves which provider to use for a client. If no live adapter is
 * configured, it returns null and callers fall back to CSV/manual/demo.
 */
export interface ProviderRegistry {
  forRankTracking(clientId: string): Promise<RankTrackingProvider | null>;
  forBacklinks(clientId: string): Promise<BacklinkProvider | null>;
  forTechnical(clientId: string): Promise<TechnicalAuditProvider | null>;
  forSearchConsole(clientId: string): Promise<SearchConsoleProvider | null>;
  forAnalytics(clientId: string): Promise<AnalyticsProvider | null>;
}

/**
 * Sync job contract. Jobs are idempotent, retry with exponential backoff, and
 * log every step. The MVP implements an in-process runner; production uses a
 * queue (BullMQ + Redis) behind the same interface.
 */
export interface SyncJobRunner {
  enqueue(job: {
    provider: IntegrationProvider;
    jobType: string;
    clientId: string;
    payload?: unknown;
  }): Promise<{ jobId: string }>;
}
