import "server-only";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Append-only audit log. Call recordAudit() inside mutations after the write
 * succeeds. Never await in a way that blocks the response path if it is not
 * required; but for sensitive actions we await to guarantee the record exists.
 */
export interface AuditContext {
  organizationId: string;
  actorId?: string;
  action: string; // e.g. "client.create", "worklog.approve"
  entityType: string;
  entityId?: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

export async function recordAudit(ctx: AuditContext): Promise<void> {
  let ipAddress: string | undefined;
  try {
    const hdrs = await headers();
    ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      undefined;
  } catch {
    // headers() not available in this context (e.g. background job)
  }

  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: ctx.action,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      previousValue: ctx.previousValue,
      newValue: ctx.newValue,
      ipAddress,
    },
  });
}
