import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";

export interface KeywordFilters {
  clientId?: string;
  search?: string;
  groupId?: string;
  isBrand?: boolean;
  trackingStatus?: string;
}

export async function listKeywords(user: SessionUser, filters: KeywordFilters = {}) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.KeywordWhereInput = { client: clientFilter };

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.groupId) where.keywordGroupId = filters.groupId;
  if (filters.isBrand !== undefined) where.isBrand = filters.isBrand;
  if (filters.trackingStatus) where.trackingStatus = filters.trackingStatus as any;
  if (filters.search) {
    where.OR = [
      { keyword: { contains: filters.search, mode: "insensitive" } },
      { targetUrl: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.keyword.findMany({
    where,
    orderBy: [{ currentPosition: "asc" }, { keyword: "asc" }],
    include: {
      keywordGroup: { select: { id: true, name: true, color: true } },
      _count: { select: { snapshots: true } },
    },
  });
}
