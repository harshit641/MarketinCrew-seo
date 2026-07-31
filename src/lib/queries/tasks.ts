import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma, TaskStatus } from "@/generated/prisma/client";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";

export interface TaskFilters {
  clientId?: string;
  assigneeId?: string;
  category?: string;
  status?: TaskStatus | "ALL" | "OVERDUE" | "AWAITING_APPROVAL";
  search?: string;
}

export async function listTasks(user: SessionUser, filters: TaskFilters = {}) {
  const clientFilter = await getClientFilter(user);
  const where: Prisma.TaskWhereInput = { client: clientFilter, deletedAt: null };

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.category) where.category = filters.category as any;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.status === "OVERDUE") {
    where.status = { notIn: ["DONE", "CANCELLED"] };
    where.dueDate = { lt: new Date() };
  } else if (filters.status === "AWAITING_APPROVAL") {
    where.approvalStatus = "PENDING";
  } else if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  return prisma.task.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, name: true, slug: true } },
      assignee: { select: { id: true, name: true } },
    },
  });
}
