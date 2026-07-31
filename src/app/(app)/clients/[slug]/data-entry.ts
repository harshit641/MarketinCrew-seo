"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import { domainFromUrl } from "@/lib/utils";
import type { ActionResult } from "@/app/(auth)/actions";
import { Device, SearchIntent, LinkType, BacklinkStatus } from "@/generated/prisma/enums";
import Papa from "papaparse";

function ok(): ActionResult {
  return { ok: true, data: undefined };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

/** Verify the client is real and in the user's scope; return it + its slug. */
async function scopeClient(user: { id: string; organizationId: string; role: any }, clientId: string) {
  const filter = await getClientFilter(user as any);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter }, select: { id: true, slug: true } });
  if (!client) throw new Error("Client not found or not accessible.");
  return client;
}

function canEditData(user: { role: any }) {
  return (
    hasPermission(user.role, PERMISSIONS.IMPORT_KEYWORDS) ||
    hasPermission(user.role, PERMISSIONS.IMPORT_BACKLINKS) ||
    hasPermission(user.role, PERMISSIONS.CREATE_CLIENT)
  );
}

// ---------------------------------------------------------------------------
// KEYWORDS
// ---------------------------------------------------------------------------
const keywordSchema = z.object({
  keyword: z.string().min(2, "Keyword is required."),
  searchVolume: z.coerce.number().int().min(0).optional(),
  difficulty: z.coerce.number().int().min(0).max(100).optional(),
  cpc: z.coerce.number().min(0).optional(),
  country: z.string().default("US"),
  city: z.string().optional(),
  device: z.enum(["DESKTOP", "MOBILE"]).default("DESKTOP"),
  targetUrl: z.string().optional(),
  isBrand: z.coerce.boolean().default(false),
  searchIntent: z.enum(["INFORMATIONAL", "NAVIGATIONAL", "COMMERCIAL", "TRANSACTIONAL"]).optional(),
  group: z.string().optional(),
  baselinePosition: z.coerce.number().int().min(1).max(101).optional(),
  priority: z.coerce.number().int().min(1).max(5).default(3),
});

export async function addKeywordAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted to add keyword data.");
  const parsed = keywordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  // resolve / create group
  let groupId: string | null = null;
  if (d.group) {
    const g = await prisma.keywordGroup.upsert({
      where: { clientId_name: { clientId, name: d.group } },
      update: {}, create: { clientId, name: d.group },
    });
    groupId = g.id;
  }

  const device = d.device === "MOBILE" ? Device.MOBILE : Device.DESKTOP;
  // upsert by unique key so re-adding updates instead of duplicating
  const existing = await prisma.keyword.findFirst({
    where: { clientId, keyword: d.keyword, country: d.country, city: d.city || null, device, searchEngine: "google" },
  });

  const baseData = {
    searchVolume: d.searchVolume ?? null,
    difficulty: d.difficulty ?? null,
    cpc: d.cpc ?? null,
    country: d.country,
    city: d.city || null,
    device,
    targetUrl: d.targetUrl || null,
    isBrand: d.isBrand,
    searchIntent: d.searchIntent as SearchIntent | undefined,
    keywordGroupId: groupId,
    baselinePosition: d.baselinePosition ?? null,
    priority: d.priority,
  };

  if (existing) {
    await prisma.keyword.update({ where: { id: existing.id }, data: baseData });
  } else {
    await prisma.keyword.create({ data: { clientId, keyword: d.keyword, searchEngine: "google", ...baseData } });
  }

  await recordAudit({ organizationId: user.organizationId, actorId: user.id, action: "keyword.add", entityType: "keyword", entityId: clientId });
  revalidatePath(`/clients/${client.slug}/rankings`);
  revalidatePath(`/clients/${client.slug}`);
  return ok();
}

export async function deleteKeywordAction(keywordId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted.");
  const filter = await getClientFilter(user);
  const kw = await prisma.keyword.findFirst({ where: { id: keywordId, client: filter }, include: { client: true } });
  if (!kw) return err("Keyword not found.");
  await prisma.keyword.delete({ where: { id: keywordId } });
  await recordAudit({ organizationId: user.organizationId, actorId: user.id, action: "keyword.delete", entityType: "keyword", entityId: keywordId, previousValue: { keyword: kw.keyword } });
  revalidatePath(`/clients/${kw.client.slug}/rankings`);
  return ok();
}

// ---------------------------------------------------------------------------
// RANKING SNAPSHOTS (by date — powers monthly comparison)
// ---------------------------------------------------------------------------
const rankingSchema = z.object({
  keywordId: z.string().min(1, "Select a keyword."),
  date: z.string().min(1, "Date is required."),
  position: z.coerce.number().int().min(1).max(101),
  rankingUrl: z.string().optional(),
});

export async function addRankingSnapshotAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted to add ranking data.");
  const parsed = rankingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  const kw = await prisma.keyword.findFirst({ where: { id: d.keywordId, clientId } });
  if (!kw) return err("Keyword not found for this client.");

  const date = new Date(d.date);
  date.setHours(12, 0, 0, 0);

  // upsert by unique snapshot key
  const existing = await prisma.keywordSnapshot.findFirst({
    where: { keywordId: kw.id, date, device: kw.device, searchEngine: "google", location: kw.city },
  });
  if (existing) {
    await prisma.keywordSnapshot.update({ where: { id: existing.id }, data: { position: d.position, rankingUrl: d.rankingUrl || null } });
  } else {
    await prisma.keywordSnapshot.create({
      data: { keywordId: kw.id, clientId, date, position: d.position, rankingUrl: d.rankingUrl || null, device: kw.device, searchEngine: "google", location: kw.city, dataProvider: "MANUAL" },
    });
  }

  // keep rollup fields current (best position, current/previous)
  const prev = kw.currentPosition ?? d.position;
  await prisma.keyword.update({
    where: { id: kw.id },
    data: {
      previousPosition: prev,
      currentPosition: d.position,
      bestPosition: kw.bestPosition ? Math.min(kw.bestPosition, d.position) : d.position,
    },
  });

  await recordAudit({ organizationId: user.organizationId, actorId: user.id, action: "ranking.add", entityType: "keyword_snapshot", entityId: kw.id, newValue: { date: d.date, position: d.position } });
  revalidatePath(`/clients/${client.slug}/rankings`);
  revalidatePath(`/clients/${client.slug}`);
  return ok();
}

// ---------------------------------------------------------------------------
// BACKLINKS (with dates)
// ---------------------------------------------------------------------------
const backlinkSchema = z.object({
  sourceUrl: z.string().url("Enter a valid source URL."),
  targetUrl: z.string().url("Enter a valid target URL."),
  anchorText: z.string().optional(),
  linkType: z.enum(["DOFOLLOW", "NOFOLLOW", "SPONSORED", "UGC"]).default("DOFOLLOW"),
  status: z.enum(["LIVE", "LOST", "BROKEN", "PENDING"]).default("LIVE"),
  domainRating: z.coerce.number().int().min(0).max(100).optional(),
  acquiredAt: z.string().min(1, "Acquired date is required."),
  cost: z.coerce.number().min(0).optional(),
  vendor: z.string().optional(),
  campaign: z.string().optional(),
  linkBuildingMethod: z.string().optional(),
});

export async function addBacklinkAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.IMPORT_BACKLINKS) && !hasPermission(user.role, PERMISSIONS.CREATE_CLIENT)) return err("Not permitted to add backlinks.");
  const parsed = backlinkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  await prisma.backlink.create({
    data: {
      clientId,
      sourceUrl: d.sourceUrl,
      sourceDomain: domainFromUrl(d.sourceUrl),
      targetUrl: d.targetUrl,
      anchorText: d.anchorText || null,
      linkType: d.linkType as any,
      status: d.status as any,
      domainRating: d.domainRating ?? null,
      acquiredAt: new Date(d.acquiredAt),
      firstSeenAt: new Date(d.acquiredAt),
      lastCheckedAt: new Date(),
      cost: d.cost ?? null,
      vendor: d.vendor || null,
      campaign: d.campaign || null,
      linkBuildingMethod: d.linkBuildingMethod || null,
    },
  });

  await recordAudit({ organizationId: user.organizationId, actorId: user.id, action: "backlink.add", entityType: "backlink", entityId: clientId });
  revalidatePath(`/clients/${client.slug}/backlinks`);
  revalidatePath(`/clients/${client.slug}`);
  return ok();
}

export async function deleteBacklinkAction(backlinkId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.DELETE_BACKLINK)) return err("Not permitted.");
  const filter = await getClientFilter(user);
  const bl = await prisma.backlink.findFirst({ where: { id: backlinkId, client: filter }, include: { client: true } });
  if (!bl) return err("Backlink not found.");
  await prisma.backlink.delete({ where: { id: backlinkId } });
  revalidatePath(`/clients/${bl.client.slug}/backlinks`);
  return ok();
}

// ---------------------------------------------------------------------------
// ANALYTICS (GA4 manual entry, by date)
// ---------------------------------------------------------------------------
const analyticsSchema = z.object({
  date: z.string().min(1, "Date is required."),
  sessions: z.coerce.number().int().min(0).default(0),
  users: z.coerce.number().int().min(0).default(0),
  newUsers: z.coerce.number().int().min(0).default(0),
  conversions: z.coerce.number().int().min(0).default(0),
  revenue: z.coerce.number().min(0).optional(),
});

export async function addAnalyticsAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted to add analytics data.");
  const parsed = analyticsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  const date = new Date(d.date);
  date.setHours(12, 0, 0, 0);

  // upsert by (client, date) so re-entering a day updates it
  const existing = await prisma.analyticsSnapshot.findFirst({ where: { clientId, date } });
  if (existing) {
    await prisma.analyticsSnapshot.update({ where: { id: existing.id }, data: { sessions: d.sessions, users: d.users, newUsers: d.newUsers, conversions: d.conversions, revenue: d.revenue ?? null, dataProvider: "MANUAL" } });
  } else {
    await prisma.analyticsSnapshot.create({
      data: { clientId, date, sessions: d.sessions, users: d.users, newUsers: d.newUsers, conversions: d.conversions, revenue: d.revenue ?? null, sourceMedium: "google / organic", dataProvider: "MANUAL" },
    });
  }

  revalidatePath(`/clients/${client.slug}/analytics`);
  revalidatePath(`/clients/${client.slug}`);
  return ok();
}

// ---------------------------------------------------------------------------
// SEARCH CONSOLE (manual entry, by date)
// ---------------------------------------------------------------------------
const gscSchema = z.object({
  date: z.string().min(1, "Date is required."),
  clicks: z.coerce.number().int().min(0).default(0),
  impressions: z.coerce.number().int().min(0).default(0),
  ctr: z.coerce.number().min(0).optional(),
  position: z.coerce.number().min(0).optional(),
  query: z.string().optional(),
  page: z.string().optional(),
});

export async function addSearchConsoleAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted to add Search Console data.");
  const parsed = gscSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  const date = new Date(d.date);
  date.setHours(12, 0, 0, 0);
  const ctr = d.ctr ?? (d.impressions > 0 ? d.clicks / d.impressions : 0);

  await prisma.searchConsoleSnapshot.create({
    data: { clientId, date, clicks: d.clicks, impressions: d.impressions, ctr, position: d.position ?? null, query: d.query || null, page: d.page || null, device: "desktop", isBranded: null, dataProvider: "MANUAL" },
  });

  revalidatePath(`/clients/${client.slug}/search-console`);
  revalidatePath(`/clients/${client.slug}`);
  return ok();
}

// ---------------------------------------------------------------------------
// TECHNICAL ISSUES / FIXES
// ---------------------------------------------------------------------------
const issueSchema = z.object({
  url: z.string().min(1, "URL is required."),
  category: z.string().min(1, "Category is required."),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).default("MEDIUM"),
  description: z.string().optional(),
  recommendedFix: z.string().optional(),
});

export async function addTechnicalIssueAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted to add technical issues.");
  const parsed = issueSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  await prisma.technicalIssue.create({
    data: {
      clientId,
      url: d.url,
      category: d.category,
      severity: d.severity as any,
      description: d.description || null,
      recommendedFix: d.recommendedFix || null,
      status: "OPEN",
      source: "MANUAL",
    },
  });

  revalidatePath(`/clients/${client.slug}/technical`);
  return ok();
}

export async function updateIssueStatusAction(issueId: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED"): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted.");
  const filter = await getClientFilter(user);
  const issue = await prisma.technicalIssue.findFirst({ where: { id: issueId, client: filter }, include: { client: true } });
  if (!issue) return err("Issue not found.");
  await prisma.technicalIssue.update({ where: { id: issueId }, data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null } });
  revalidatePath(`/clients/${issue.client.slug}/technical`);
  return ok();
}

export async function deleteTechnicalIssueAction(issueId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!canEditData(user)) return err("Not permitted.");
  const filter = await getClientFilter(user);
  const issue = await prisma.technicalIssue.findFirst({ where: { id: issueId, client: filter }, include: { client: true } });
  if (!issue) return err("Issue not found.");
  await prisma.technicalIssue.delete({ where: { id: issueId } });
  revalidatePath(`/clients/${issue.client.slug}/technical`);
  return ok();
}

// ---------------------------------------------------------------------------
// AHREFS CSV IMPORT (Ahrefs export column mapping)
// Ahrefs uses columns like "#Referring page URL", "Domain rating", "First seen",
// "Anchor text", "Type" (DoFollow/NoFollow), "Status" (Live/Lost), "Destination".
// We auto-detect these and map them onto our backlink schema.
// ---------------------------------------------------------------------------
export async function importAhrefsBacklinksAction(
  clientId: string,
  csvText: string,
): Promise<ActionResult<{ inserted: number; updated: number; skipped: number; errors: string[] }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.IMPORT_BACKLINKS) && !hasPermission(user.role, PERMISSIONS.CREATE_CLIENT)) {
    return err("Not permitted to import backlinks.");
  }

  let client;
  try { client = await scopeClient(user, clientId); } catch (e: any) { return err(e.message); }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    // keep raw headers — Ahrefs uses spaces, #, mixed case
  });
  const rows = parsed.data.filter((r) => Object.values(r).some((v) => v && v.includes("http")));

  const summary = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // Build a column-name resolver that handles Ahrefs' variations.
  function pick(row: Record<string, string>, candidates: string[]): string | undefined {
    const lowerMap: Record<string, string> = {};
    for (const k of Object.keys(row)) lowerMap[k.toLowerCase().replace(/[#\s_-]+/g, "")] = k;
    for (const c of candidates) {
      const norm = c.toLowerCase().replace(/[#\s_-]+/g, "");
      if (lowerMap[norm]) return row[lowerMap[norm]];
    }
    return undefined;
  }

  for (const row of rows) {
    try {
      const sourceUrl = pick(row, ["referringpageurl", "sourceurl", "url", "referringurl"])?.trim();
      const targetUrl = pick(row, ["destination", "targeturl", "destinationurl", "linkurl"])?.trim();
      if (!sourceUrl || !targetUrl) { summary.skipped++; continue; }

      const dr = pick(row, ["domainrating", "dr"]);
      const ur = pick(row, ["urlrating", "ur"]);
      const firstSeen = pick(row, ["firstseen", "firstseen(utc)"]);
      const anchor = pick(row, ["anchortext", "anchor"]);
      const typeRaw = (pick(row, ["type", "linktype"]) || "DoFollow").toLowerCase();
      const statusRaw = (pick(row, ["status", "linkstatus"]) || "live").toLowerCase();
      const traffic = pick(row, ["traffic", "domaintraffic"]);

      const data = {
        sourceUrl,
        sourceDomain: domainFromUrl(sourceUrl),
        targetUrl,
        anchorText: anchor || null,
        linkType: parseLinkType(typeRaw),
        status: parseStatus(statusRaw),
        domainRating: dr ? parseInt(dr, 10) || null : null,
        urlRating: ur ? parseInt(ur, 10) || null : null,
        acquiredAt: firstSeen ? new Date(firstSeen) : new Date(),
        firstSeenAt: firstSeen ? new Date(firstSeen) : new Date(),
        lastCheckedAt: new Date(),
        trafficEstimate: traffic ? parseInt(traffic, 10) || null : null,
        httpStatus: 200,
        linkBuildingMethod: "Ahrefs import",
      };

      const existing = await prisma.backlink.findFirst({ where: { clientId, sourceUrl, targetUrl } });
      if (existing) {
        await prisma.backlink.update({ where: { id: existing.id }, data });
        summary.updated++;
      } else {
        await prisma.backlink.create({ data: { clientId, ...data } });
        summary.inserted++;
      }
    } catch (e: any) {
      summary.errors.push(`Row skipped: ${e.message}`);
      summary.skipped++;
    }
  }

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "backlink.import_ahrefs",
    entityType: "backlink", entityId: clientId,
    newValue: { inserted: summary.inserted, updated: summary.updated, source: "Ahrefs CSV" },
  });
  revalidatePath(`/clients/${client.slug}/backlinks`);
  revalidatePath(`/clients/${client.slug}`);
  return { ok: true, data: summary };
}

function parseLinkType(v: string): LinkType {
  const s = v.toUpperCase().replace(/[-\s]/g, "_");
  if (s.includes("NOFOLLOW")) return LinkType.NOFOLLOW;
  if (s.includes("SPONSORED")) return LinkType.SPONSORED;
  if (s.includes("UGC")) return LinkType.UGC;
  return LinkType.DOFOLLOW;
}
function parseStatus(v: string): BacklinkStatus {
  const s = v.toUpperCase();
  if (s.includes("LOST")) return BacklinkStatus.LOST;
  if (s.includes("BROKEN")) return BacklinkStatus.BROKEN;
  if (s.includes("PENDING")) return BacklinkStatus.PENDING;
  return BacklinkStatus.LIVE;
}
