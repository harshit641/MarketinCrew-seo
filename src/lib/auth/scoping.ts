import "server-only";
import { prisma } from "@/lib/db";
import { SystemRole } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/permissions";

/**
 * ===========================================================================
// Client-level data isolation.
 *
// Every data access function must call one of these helpers to constrain
// queries by the user's org AND the set of clients they may touch. This is
// the single chokepoint that enforces:
//   - Super admins: all clients in their org.
//   - Managers / Executives: only clients they are assigned to.
//   - Client viewers: only the single client they have portal membership for.
 *
// Defense in depth: even routes that pass a clientId from the URL are filtered
// through this set, so a user can never read another client's data by guessing
// an id.
 * ===========================================================================
 */

export interface ClientScope {
  organizationId: string;
  /** All clients the user may view. Undefined means "all clients in the org". */
  clientIds: string[] | undefined;
  /** For client viewers, their single client. */
  singleClientId: string | null;
}

export async function resolveClientScope(user: SessionUser): Promise<ClientScope> {
  if (user.role === SystemRole.SUPER_ADMIN) {
    return { organizationId: user.organizationId, clientIds: undefined, singleClientId: null };
  }

  if (user.role === SystemRole.CLIENT_VIEWER) {
    const memberships = await prisma.clientMember.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    const ids = memberships.map((m) => m.clientId);
    return {
      organizationId: user.organizationId,
      clientIds: ids,
      singleClientId: ids[0] ?? null,
    };
  }

  // Manager / Executive: clients they are assigned to via ClientAssignment.
  const assignments = await prisma.clientAssignment.findMany({
    where: { employee: { userId: user.id } },
    select: { clientId: true },
  });
  const ids = [...new Set(assignments.map((a) => a.clientId))];
  return { organizationId: user.organizationId, clientIds: ids, singleClientId: null };
}

/**
 * Returns a where-clause fragment constraining clients/scope by the user.
 * Use `.clientFilter` as the base `where` for client-scoped queries.
 */
export async function getClientFilter(user: SessionUser): Promise<{
  organizationId: string;
  deletedAt: null;
  id?: { in: string[] };
}> {
  const scope = await resolveClientScope(user);
  const base = { organizationId: scope.organizationId, deletedAt: null as null };
  if (scope.clientIds === undefined) return base;
  return { ...base, id: { in: scope.clientIds } };
}

/**
 * Asserts the user may access a given client. Throws ForbiddenError otherwise.
 * Always re-fetches from the DB to avoid trusting client-provided data.
 */
export async function assertClientAccess(
  user: SessionUser,
  clientId: string,
): Promise<void> {
  if (!isStaff(user.role) && user.role !== SystemRole.CLIENT_VIEWER) {
    throw new (await import("@/lib/auth/session")).ForbiddenError(
      "Your role cannot access client data.",
    );
  }
  const scope = await resolveClientScope(user);
  if (scope.clientIds === undefined) return; // super admin
  if (!scope.clientIds.includes(clientId)) {
    throw new (await import("@/lib/auth/session")).ForbiddenError(
      "You do not have access to this client.",
    );
  }
}
