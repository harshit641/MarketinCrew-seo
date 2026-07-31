"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import { domainFromUrl } from "@/lib/utils";
import type { ActionResult } from "@/app/(auth)/actions";
import { LinkType, BacklinkStatus } from "@/generated/prisma/enums";

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
 * Backlink CSV import. Columns (flexible, case-insensitive):
 * source_url, target_url, anchor_text, link_type, status, domain_rating,
 * url_rating, first_seen, acquired, cost, vendor, campaign, method, country
 */
export async function importBacklinksCsvAction(
  clientId: string,
  csvText: string,
): Promise<ActionResult<ImportSummary>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.IMPORT_BACKLINKS)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter } });
  if (!client) return err("Client not found.");

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const rows = parsed.data.filter((r) => r.source_url && r.target_url);
  const summary: ImportSummary = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const sourceUrl = row.source_url.trim();
      const sourceDomain = row.source_domain?.trim() || domainFromUrl(sourceUrl);
      const targetUrl = row.target_url.trim();

      const data = {
        sourceUrl,
        sourceDomain,
        targetUrl,
        anchorText: row.anchor_text?.trim() || null,
        linkType: parseLinkType(row.link_type),
        status: parseStatus(row.status),
        domainRating: numOrNull(row.domain_rating),
        urlRating: numOrNull(row.url_rating),
        acquiredAt: row.acquired ? new Date(row.acquired) : row.first_seen ? new Date(row.first_seen) : new Date(),
        firstSeenAt: row.first_seen ? new Date(row.first_seen) : new Date(),
        lastCheckedAt: new Date(),
        cost: floatOrNull(row.cost),
        vendor: row.vendor?.trim() || null,
        campaign: row.campaign?.trim() || null,
        linkBuildingMethod: row.method?.trim() || null,
        country: row.country?.trim() || null,
        httpStatus: numOrNull(row.http_status) ?? 200,
      };

      // Dedup by (clientId, sourceUrl, targetUrl)
      const existing = await prisma.backlink.findFirst({
        where: { clientId, sourceUrl, targetUrl },
      });
      if (existing) {
        await prisma.backlink.update({ where: { id: existing.id }, data });
        summary.updated++;
      } else {
        await prisma.backlink.create({ data: { clientId, ...data } });
        summary.inserted++;
      }
    } catch (e: any) {
      summary.errors.push(`Row "${row.source_url}": ${e.message}`);
      summary.skipped++;
    }
  }

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "backlink.import",
    entityType: "backlink", entityId: clientId,
    newValue: { inserted: summary.inserted, updated: summary.updated },
  });
  revalidatePath(`/clients/${client.slug}/backlinks`);
  revalidatePath("/backlinks");
  return ok(summary);
}

function parseLinkType(v?: string): LinkType {
  const s = (v ?? "").toUpperCase().replace(/[-\s]/g, "_");
  if (s === "NOFOLLOW") return LinkType.NOFOLLOW;
  if (s === "SPONSORED") return LinkType.SPONSORED;
  if (s === "UGC") return LinkType.UGC;
  return LinkType.DOFOLLOW;
}
function parseStatus(v?: string): BacklinkStatus {
  const s = (v ?? "").toUpperCase();
  if (s === "LOST") return BacklinkStatus.LOST;
  if (s === "BROKEN") return BacklinkStatus.BROKEN;
  if (s === "PENDING") return BacklinkStatus.PENDING;
  return BacklinkStatus.LIVE;
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

export async function deleteBacklinkAction(backlinkId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.DELETE_BACKLINK)) return err("Not permitted.");
  const filter = await getClientFilter(user);
  const bl = await prisma.backlink.findFirst({ where: { id: backlinkId, client: filter } });
  if (!bl) return err("Backlink not found.");
  await prisma.backlink.delete({ where: { id: backlinkId } });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "backlink.delete",
    entityType: "backlink", entityId: backlinkId, previousValue: { sourceUrl: bl.sourceUrl },
  });
  revalidatePath("/backlinks");
  return ok(undefined);
}
