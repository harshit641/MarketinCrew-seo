import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";

export interface WorkLogFilters {
  clientId?: string;
  employeeId?: string;
  category?: string;
  approvalStatus?: string;
  from?: string;
  to?: string;
}

export async function listWorkLogs(user: SessionUser, filters: WorkLogFilters = {}) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.WorkLogWhereInput = { client: clientFilter };

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus as any;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  if (filters.category) {
    where.items = { some: { category: filters.category as any } };
  }

  return prisma.workLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, name: true, slug: true } },
      employee: { include: { user: { select: { id: true, name: true } } } },
      items: true,
      approvals: { include: { approver: { select: { name: true } } } },
    },
  });
}
