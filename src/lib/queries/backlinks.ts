import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";

export interface BacklinkFilters {
  clientId?: string;
  status?: string;
  linkType?: string;
  search?: string;
}

export async function listBacklinks(user: SessionUser, filters: BacklinkFilters = {}) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.BacklinkWhereInput = { client: clientFilter };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.status) where.status = filters.status as any;
  if (filters.linkType) where.linkType = filters.linkType as any;
  if (filters.search) {
    where.OR = [
      { sourceUrl: { contains: filters.search, mode: "insensitive" } },
      { sourceDomain: { contains: filters.search, mode: "insensitive" } },
      { anchorText: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return prisma.backlink.findMany({
    where,
    orderBy: [{ acquiredAt: "desc" }, { createdAt: "desc" }],
    include: { owner: { select: { name: true } } },
  });
}
