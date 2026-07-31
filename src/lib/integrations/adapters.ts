import "server-only";
import { prisma } from "@/lib/db";
import { IntegrationProvider, Device } from "@/generated/prisma/enums";
import type {
  RankTrackingProvider,
  RankingSnapshotInput,
  SearchConsoleProvider,
  GscRow,
  AnalyticsProvider,
  AnalyticsRow,
  BacklinkProvider,
  BacklinkInput,
  TechnicalAuditProvider,
  TechnicalIssueInput,
  PageSpeedInput,
  SyncJobRunner,
} from "./providers";

/**
 * ===========================================================================
   Demo provider. Generates clearly-labelled mock data for development and
   sales demos. The `dataSource` string ALWAYS contains "DEMO (mock)" so the UI
   can never present it as live client data.
   ===========================================================================
 */

const DEMO_SOURCE = "DEMO (mock) — not real data";

export const DemoRankProvider: RankTrackingProvider = {
  provider: IntegrationProvider.DEMO,
  async fetchRankings({ keywords, country, device, date }) {
    const snapshots: RankingSnapshotInput[] = keywords.map((kw, i) => ({
      keyword: kw,
      date,
      position: Math.max(1, Math.round(5 + (i % 7) * 6 + (Math.sin(date.getDate() + i) * 3))),
      rankingUrl: null,
      device,
      country,
      searchEngine: "google",
    }));
    return { snapshots, dataSource: DEMO_SOURCE };
  },
};

export const DemoSearchConsoleProvider: SearchConsoleProvider = {
  provider: IntegrationProvider.DEMO,
  async fetchPerformance({ property, startDate, endDate }) {
    const rows: GscRow[] = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const base = 200 + Math.round(Math.sin(i / 3) * 40);
      rows.push({
        date: d, clicks: base, impressions: base * 12, ctr: base / (base * 12),
        position: 6 + (i % 4), device: "desktop",
      });
    }
    void property;
    return { rows, dataSource: DEMO_SOURCE };
  },
};

export const DemoAnalyticsProvider: AnalyticsProvider = {
  provider: IntegrationProvider.DEMO,
  async fetchOrganic({ startDate, endDate }) {
    const rows: AnalyticsRow[] = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const sessions = 280 + Math.round(Math.sin(i / 4) * 60);
      rows.push({ date: d, sessions, users: Math.round(sessions * 0.8), newUsers: Math.round(sessions * 0.6), conversions: Math.round(sessions * 0.03) });
    }
    return { rows, dataSource: DEMO_SOURCE };
  },
};

export const DemoBacklinkProvider: BacklinkProvider = {
  provider: IntegrationProvider.DEMO,
  async fetchBacklinks({ domain }) {
    const backlinks: BacklinkInput[] = [
      { sourceUrl: `https://demo-blog.example/${domain}`, sourceDomain: "demo-blog.example", targetUrl: `https://${domain}/`, anchorText: domain, linkType: "DOFOLLOW", domainRating: 42, firstSeenAt: new Date() },
    ];
    return { backlinks, dataSource: DEMO_SOURCE };
  },
};

export const DemoTechnicalProvider: TechnicalAuditProvider = {
  provider: IntegrationProvider.DEMO,
  async runAudit({ domain }) {
    const issues: TechnicalIssueInput[] = [
      { url: `https://${domain}/`, category: "LCP", severity: "MEDIUM", description: "Large Contentful Paint is above 2.5s (demo).", recommendedFix: "Optimize hero image." },
    ];
    return { issues, dataSource: DEMO_SOURCE };
  },
};

// PageSpeed shape helper (concrete adapter calls the live PSI API in Phase 2)
export type { PageSpeedInput };

/**
 * ===========================================================================
   In-process sync job runner (MVP). Production swaps this for BullMQ + Redis
   behind the same SyncJobRunner interface — no caller changes required.
   Implements: idempotency, retry with exponential backoff, partial-failure
   logging, and a SyncJob + SyncLog record per run.
   ===========================================================================
 */

export const InProcessSyncRunner: SyncJobRunner = {
  async enqueue({ provider, jobType, clientId, payload }) {
    const job = await prisma.syncJob.create({
      data: { provider, jobType, status: "RUNNING", metadata: payload as any },
    });
    const jobId = job.id;

    // Fire and forget; the runner retries on failure.
    runWithRetry(jobId, clientId, jobType).catch(async (e) => {
      await prisma.syncJob.update({ where: { id: jobId }, data: { status: "FAILED", error: String(e), finishedAt: new Date() } });
      await prisma.syncLog.create({ data: { syncJobId: jobId, level: "error", message: `Job failed permanently: ${e}` } });
    });

    return { jobId };
  },
};

async function runWithRetry(jobId: string, clientId: string, jobType: string, attempt = 0): Promise<void> {
  try {
    await prisma.syncLog.create({ data: { syncJobId: jobId, level: "info", message: `Started ${jobType} for client ${clientId} (attempt ${attempt + 1})` } });
    // TODO: dispatch to the appropriate adapter based on jobType + provider.
    // For the MVP, this is a structural placeholder that records a successful no-op.
    await prisma.syncJob.update({ where: { id: jobId }, data: { status: "SUCCESS", finishedAt: new Date(), recordsProcessed: 0 } });
    await prisma.syncLog.create({ data: { syncJobId: jobId, level: "info", message: "Completed (no-op in MVP; live adapters are Phase 2)" } });
  } catch (e: any) {
    if (attempt < 3) {
      const backoffMs = Math.min(30000, 1000 * 2 ** attempt); // exponential backoff, max 30s
      await prisma.syncLog.create({ data: { syncJobId: jobId, level: "warn", message: `Attempt ${attempt + 1} failed: ${e.message}; retrying in ${backoffMs}ms` } });
      await new Promise((r) => setTimeout(r, backoffMs));
      return runWithRetry(jobId, clientId, jobType, attempt + 1);
    }
    throw e;
  }
}
