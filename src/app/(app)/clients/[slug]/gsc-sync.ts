"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import {
  fetchSearchConsolePerformance,
  listSearchConsoleSites,
  isGoogleConfigured,
} from "@/lib/integrations/google";
import { IntegrationProvider, IntegrationStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/app/(auth)/actions";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

export interface SyncSummary {
  rowsStored: number;
  daysSynced: number;
  property: string;
}

/** Sync the last N days of Search Console data for a connected client. */
export async function syncSearchConsoleAction(
  clientId: string,
  days = 28,
): Promise<ActionResult<SyncSummary>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");

  if (!isGoogleConfigured()) {
    return err("Google OAuth is not configured on this server. Add your Google Cloud credentials to .env, or enter data manually instead.");
  }

  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter }, select: { id: true, slug: true, primaryDomain: true } });
  if (!client) return err("Client not found.");

  const integration = await prisma.clientIntegration.findUnique({
    where: { clientId_provider: { clientId, provider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE } },
  });
  if (!integration || integration.status !== "CONNECTED") {
    return err("Google Search Console is not connected for this client. Connect it first.");
  }

  // Determine the property: stored config label, else match by domain.
  let siteUrl = integration.label || "";
  if (!siteUrl) {
    const sites = await listSearchConsoleSites(clientId);
    const match = sites.find((s) => s.siteUrl.includes(client.primaryDomain || "")) || sites[0];
    if (!match) return err("No Search Console properties found for this Google account.");
    siteUrl = match.siteUrl;
    await prisma.clientIntegration.update({ where: { id: integration.id }, data: { label: siteUrl } });
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const rows = await fetchSearchConsolePerformance(
      clientId,
      siteUrl,
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10),
      5000,
    );

    // Upsert aggregated-by-date snapshots (one row per date, summed).
    const byDate = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; n: number }>();
    for (const r of rows) {
      const cur = byDate.get(r.date) ?? { clicks: 0, impressions: 0, ctr: 0, position: 0, n: 0 };
      cur.clicks += r.clicks;
      cur.impressions += r.impressions;
      cur.position += r.position;
      cur.n += 1;
      byDate.set(r.date, cur);
    }

    let stored = 0;
    for (const [dateStr, agg] of byDate.entries()) {
      const date = new Date(dateStr);
      date.setHours(12, 0, 0, 0);
      const ctr = agg.impressions > 0 ? agg.clicks / agg.impressions : 0;
      const position = agg.n > 0 ? agg.position / agg.n : 0;

      const existing = await prisma.searchConsoleSnapshot.findFirst({
        where: { clientId, date, dataProvider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE },
      });
      if (existing) {
        await prisma.searchConsoleSnapshot.update({
          where: { id: existing.id },
          data: { clicks: agg.clicks, impressions: agg.impressions, ctr, position, query: "(synced aggregate)", device: "desktop" },
        });
      } else {
        await prisma.searchConsoleSnapshot.create({
          data: { clientId, date, clicks: agg.clicks, impressions: agg.impressions, ctr, position, query: "(synced aggregate)", device: "desktop", isBranded: null, dataProvider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE },
        });
      }
      stored++;
    }

    await prisma.clientIntegration.update({
      where: { id: integration.id },
      data: { status: IntegrationStatus.CONNECTED, lastSyncAt: new Date(), lastSyncAttemptAt: new Date(), lastError: null, apiUsageCount: { increment: 1 } },
    });

    await recordAudit({
      organizationId: user.organizationId, actorId: user.id, action: "gsc.sync",
      entityType: "client_integration", entityId: integration.id,
      newValue: { daysSynced: stored, property: siteUrl },
    });

    revalidatePath(`/clients/${client.slug}/search-console`);
    revalidatePath(`/clients/${client.slug}`);
    return ok({ rowsStored: rows.length, daysSynced: stored, property: siteUrl });
  } catch (e: any) {
    await prisma.clientIntegration.update({
      where: { id: integration.id },
      data: { status: IntegrationStatus.ERROR, lastError: e.message, lastSyncAttemptAt: new Date() },
    });
    return err(`GSC sync failed: ${e.message}`);
  }
}

/** Disconnect Google for a client (keeps historical synced data). */
export async function disconnectSearchConsoleAction(clientId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter } });
  if (!client) return err("Client not found.");

  await prisma.clientIntegration.updateMany({
    where: { clientId, provider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE },
    data: { status: IntegrationStatus.DISCONNECTED, encryptedCredentials: null, lastError: null },
  });

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "integration.disconnect",
    entityType: "client_integration", entityId: clientId, newValue: { provider: "GOOGLE_SEARCH_CONSOLE" },
  });
  revalidatePath(`/clients/${client.slug}/search-console`);
  return ok(undefined);
}
