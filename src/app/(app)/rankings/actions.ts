"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/(auth)/actions";
import { Device, KeywordTrackingStatus, IntegrationProvider } from "@/generated/prisma/enums";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

export interface ImportSummary {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Keyword CSV import. Expected columns (flexible, case-insensitive):
 * keyword, search_volume, difficulty, cpc, country, city, device, url,
 * is_brand, intent, group, baseline_position, current_position, best_position
 *
 * Idempotent: matching (clientId, keyword, country, city, device, searchEngine)
 * updates the existing row; otherwise inserts. Duplicate rows within the same
 * file are merged.
 */
export async function importKeywordsCsvAction(
  clientId: string,
  csvText: string,
): Promise<ActionResult<ImportSummary>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.IMPORT_KEYWORDS)) return err("Not permitted to import keywords.");

  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter } });
  if (!client) return err("Client not found or not accessible.");

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return err(`CSV parse error: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data.filter((r) => r.keyword && r.keyword.trim());
  const summary: ImportSummary = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

  // Pre-fetch/create keyword groups
  const groupCache = new Map<string, string>();

  for (const row of rows) {
    try {
      const keyword = row.keyword.trim();
      const country = (row.country || client.country || "US").toUpperCase();
      const city = row.city?.trim() || null;
      const device = (row.device?.toUpperCase() === "MOBILE" ? Device.MOBILE : Device.DESKTOP) as Device;
      const searchEngine = "google";

      let groupId: string | null = null;
      const groupName = row.group?.trim();
      if (groupName) {
        if (groupCache.has(groupName)) {
          groupId = groupCache.get(groupName)!;
        } else {
          const g = await prisma.keywordGroup.upsert({
            where: { clientId_name: { clientId, name: groupName } },
            update: {},
            create: { clientId, name: groupName },
          });
          groupCache.set(groupName, g.id);
          groupId = g.id;
        }
      }

      const data = {
        searchVolume: numOrNull(row.search_volume),
        difficulty: numOrNull(row.difficulty),
        cpc: floatOrNull(row.cpc),
        country,
        city,
        device,
        targetUrl: row.url?.trim() || row.target_url?.trim() || null,
        isBrand: /^(true|yes|1|brand)$/i.test(row.is_brand ?? ""),
        searchIntent: (row.intent?.toUpperCase() as any) || undefined,
        baselinePosition: numOrNull(row.baseline_position) ?? numOrNull(row.current_position) ?? 101,
        currentPosition: numOrNull(row.current_position) ?? numOrNull(row.position) ?? 101,
        bestPosition: numOrNull(row.best_position) ?? numOrNull(row.current_position) ?? 101,
        trackingStatus: KeywordTrackingStatus.ACTIVE,
      };

      const existing = await prisma.keyword.findFirst({
        where: { clientId, keyword, country, city, device, searchEngine },
      });

      if (existing) {
        await prisma.keyword.update({ where: { id: existing.id }, data: { ...data, keywordGroupId: groupId } });
        summary.updated++;
      } else {
        await prisma.keyword.create({
          data: {
            clientId,
            keyword,
            keywordGroupId: groupId,
            searchEngine,
            ...data,
          },
        });
        summary.inserted++;
      }
    } catch (e: any) {
      summary.errors.push(`Row "${row.keyword}": ${e.message}`);
      summary.skipped++;
    }
  }

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "keyword.import",
    entityType: "keyword", entityId: clientId,
    newValue: { inserted: summary.inserted, updated: summary.updated, skipped: summary.skipped },
  });

  revalidatePath(`/clients/${client.slug}/rankings`);
  revalidatePath("/rankings");
  return ok(summary);
}

/**
 * Ranking snapshot CSV import. Expected columns:
 * keyword, date, position, url, device, location
 * Matches keywords by (clientId, keyword text). Creates snapshots for the given
 * date. Idempotent via unique [keywordId, date, device, searchEngine, location].
 */
export async function importRankingsCsvAction(
  clientId: string,
  csvText: string,
): Promise<ActionResult<ImportSummary>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.IMPORT_KEYWORDS)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter } });
  if (!client) return err("Client not found.");

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const rows = parsed.data.filter((r) => r.keyword && r.position);
  const summary: ImportSummary = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const kw = await prisma.keyword.findFirst({
        where: { clientId, keyword: { equals: row.keyword.trim(), mode: "insensitive" } },
      });
      if (!kw) {
        summary.skipped++;
        summary.errors.push(`Keyword not found: "${row.keyword}". Import keywords first.`);
        continue;
      }
      const date = new Date(row.date || new Date());
      date.setHours(12, 0, 0, 0);
      const device = (row.device?.toUpperCase() === "MOBILE" ? Device.MOBILE : Device.DESKTOP) as Device;
      const location = row.location?.trim() || null;
      const position = Math.max(1, Math.min(101, parseInt(row.position, 10) || 101));

      const existing = await prisma.keywordSnapshot.findFirst({
        where: { keywordId: kw.id, date, device, searchEngine: "google", location },
      });
      if (existing) {
        await prisma.keywordSnapshot.update({ where: { id: existing.id }, data: { position, rankingUrl: row.url?.trim() || null } });
        summary.updated++;
      } else {
        await prisma.keywordSnapshot.create({
          data: {
            keywordId: kw.id, clientId, date, position,
            rankingUrl: row.url?.trim() || null,
            device, location, searchEngine: "google",
            dataProvider: IntegrationProvider.MANUAL,
          },
        });
        summary.inserted++;
      }

      // Keep the keyword's rollup fields current.
      await prisma.keyword.update({
        where: { id: kw.id },
        data: {
          currentPosition: position,
          previousPosition: kw.currentPosition,
          bestPosition: kw.bestPosition ? Math.min(kw.bestPosition, position) : position,
        },
      });
    } catch (e: any) {
      summary.errors.push(`Row "${row.keyword}": ${e.message}`);
      summary.skipped++;
    }
  }

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "ranking.import",
    entityType: "keyword_snapshot", entityId: clientId,
    newValue: { inserted: summary.inserted, updated: summary.updated },
  });
  revalidatePath(`/clients/${client.slug}/rankings`);
  revalidatePath("/rankings");
  return ok(summary);
}

function numOrNull(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}
function floatOrNull(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export async function deleteKeywordAction(keywordId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.DELETE_KEYWORD)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const kw = await prisma.keyword.findFirst({ where: { id: keywordId, client: filter } });
  if (!kw) return err("Keyword not found.");

  await prisma.keyword.delete({ where: { id: keywordId } });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "keyword.delete",
    entityType: "keyword", entityId: keywordId, previousValue: { keyword: kw.keyword },
  });
  revalidatePath("/rankings");
  return ok(undefined);
}
