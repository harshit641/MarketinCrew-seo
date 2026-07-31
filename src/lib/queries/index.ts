import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getClientFilter } from "@/lib/auth/scoping";
import type { SessionUser } from "@/lib/auth/session";

/**
 * ===========================================================================
   Scoped data-access layer. EVERY exported function takes the SessionUser and
   constrains queries by the client filter. No function here trusts a raw
   clientId from the caller without verifying it's in the user's scope.
   ===========================================================================
 */

// ---------------------------------------------------------------- Clients
export async function listClients(user: SessionUser, opts?: { search?: string }) {
  const where: Prisma.ClientWhereInput = await getClientFilter(user);
  if (opts?.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { primaryDomain: { contains: opts.search, mode: "insensitive" } },
    ];
  }
  return prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { tasks: { where: { status: { not: "DONE" } } }, keywords: { where: { trackingStatus: "ACTIVE" } } },
      },
      assignments: { include: { employee: { include: { user: true } } } },
    },
  });
}

const CLIENT_INCLUDE = {
  assignments: { include: { employee: { include: { user: true } } } },
  members: { include: { user: true } },
  integrations: true,
  goals: true,
  competitors: true,
  _count: { select: { keywords: true, backlinks: true, tasks: true, reports: true } },
} satisfies Prisma.ClientInclude;

export type ClientWithRelations = Prisma.ClientGetPayload<{ include: typeof CLIENT_INCLUDE }>;

export async function getClient(user: SessionUser, slugOrId: string): Promise<ClientWithRelations | null> {
  const filter = await getClientFilter(user);
  // org + scope filter guarantees the user can only resolve clients they may access.
  const where: Prisma.ClientWhereInput = {
    organizationId: filter.organizationId,
    deletedAt: null,
    OR: [{ slug: slugOrId }, { id: slugOrId }],
  };
  if (filter.id) {
    where.id = filter.id; // already shaped as { in: string[] }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.client.findFirst({ where, include: CLIENT_INCLUDE }) as Promise<ClientWithRelations | null>;
}

export async function assertScopedClient(user: SessionUser, clientId: string) {
  const client = await getClient(user, clientId);
  if (!client) {
    const { ForbiddenError } = await import("@/lib/auth/session");
    throw new ForbiddenError("Client not found or you lack access.");
  }
  return client;
}
