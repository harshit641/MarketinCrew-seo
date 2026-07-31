"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/(auth)/actions";
import { TaskCategory, WorkLogStatus, ApprovalStatus } from "@/generated/prisma/enums";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

/**
 * Multi-entry daily work-log submission. The client posts a date + an array of
 * WorkLogItem payloads. The employee is ALWAYS derived from the logged-in user
 * (never trusted from the form) — this enforces "cannot submit under another
 * employee's name".
 */
const itemSchema = z.object({
  clientId: z.string().optional(), // per-item client (multi-client daily log)
  taskId: z.string().optional(),
  category: z.nativeEnum(TaskCategory),
  workCompleted: z.string().min(3, "Describe what was completed."),
  deliverable: z.string().optional(),
  urlWorkedOn: z.string().optional(),
  keywordWorkedOn: z.string().optional(),
  minutesSpent: z.coerce.number().int().min(0).default(0),
  status: z.nativeEnum(WorkLogStatus).default(WorkLogStatus.COMPLETED),
  evidenceUrl: z.string().optional(),
  blocker: z.string().optional(),
  nextAction: z.string().optional(),
  internalNote: z.string().optional(),
  clientVisibleSummary: z.string().optional(),
  billable: z.coerce.boolean().default(true),
});

const submitSchema = z.object({
  clientId: z.string().min(1, "Select a primary client."),
  date: z.string().min(1, "Date is required."),
  items: z.array(itemSchema).min(1, "Add at least one activity."),
  isDraft: z.coerce.boolean().default(false),
});

export type SubmitInput = z.input<typeof submitSchema>;

export async function submitWorkLogAction(input: SubmitInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.SUBMIT_WORKLOG)) return err("Not permitted to submit work logs.");

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid submission.");
  }
  const d = parsed.data;

  // Resolve the employee record for the logged-in user (NEVER from the form).
  const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!employee) return err("Your account is not set up as an SEO team member. Contact an admin.");

  // Verify the primary client scope, and collect every distinct client touched.
  const filter = await getClientFilter(user);
  const primaryClient = await prisma.client.findFirst({ where: { id: d.clientId, ...filter } });
  if (!primaryClient) return err("Primary client not found or not accessible.");

  // Validate every per-item client is in scope too.
  const itemClientIds = [...new Set(d.items.map((i) => i.clientId).filter(Boolean))] as string[];
  if (itemClientIds.length > 0) {
    const accessible = await prisma.client.findMany({ where: { id: { in: itemClientIds }, ...filter }, select: { id: true } });
    if (accessible.length !== itemClientIds.length) {
      return err("One or more selected clients are not accessible to you.");
    }
  }

  const totalMinutes = d.items.reduce((sum, i) => sum + i.minutesSpent, 0);
  const billableMinutes = d.items.filter((i) => i.billable).reduce((sum, i) => sum + i.minutesSpent, 0);

  const workLog = await prisma.workLog.create({
    data: {
      clientId: d.clientId,
      employeeId: employee.id,
      userId: user.id,
      date: new Date(d.date),
      status: WorkLogStatus.COMPLETED,
      approvalStatus: d.isDraft ? ApprovalStatus.PENDING : ApprovalStatus.PENDING,
      isDraft: d.isDraft,
      submittedAt: d.isDraft ? null : new Date(),
      totalMinutes,
      billableMinutes,
      items: {
        create: d.items.map((it) => ({
          clientId: it.clientId || null, // per-item client for multi-client logs
          taskId: it.taskId || null,
          category: it.category,
          workCompleted: it.workCompleted,
          deliverable: it.deliverable || null,
          urlWorkedOn: it.urlWorkedOn || null,
          keywordWorkedOn: it.keywordWorkedOn || null,
          minutesSpent: it.minutesSpent,
          status: it.status,
          evidenceUrl: it.evidenceUrl || null,
          blocker: it.blocker || null,
          nextAction: it.nextAction || null,
          internalNote: it.internalNote || null,
          clientVisibleSummary: it.clientVisibleSummary || null,
          billable: it.billable,
        })),
      },
    },
  });

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "worklog.submit",
    entityType: "worklog", entityId: workLog.id,
    newValue: { clientId: d.clientId, items: d.items.length, totalMinutes },
  });

  revalidatePath("/work-logs");
  revalidatePath(`/clients/${primaryClient.slug}/work`);
  revalidatePath("/agency");
  return ok({ id: workLog.id });
}

export async function approveWorkLogAction(
  workLogId: string,
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  note?: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.APPROVE_WORKLOG)) return err("Not permitted to approve work logs.");

  const filter = await getClientFilter(user);
  const workLog = await prisma.workLog.findFirst({
    where: { id: workLogId, client: filter },
    include: { client: true },
  });
  if (!workLog) return err("Work log not found.");

  const status = decision as ApprovalStatus;
  await prisma.$transaction([
    prisma.workLog.update({ where: { id: workLogId }, data: { approvalStatus: status } }),
    prisma.workLogApproval.create({
      data: { workLogId, approverId: user.id, status, note: note || null },
    }),
  ]);

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "worklog.approve",
    entityType: "worklog", entityId: workLogId, newValue: { decision, note },
  });

  revalidatePath("/work-logs");
  revalidatePath(`/clients/${workLog.client.slug}/work`);
  revalidatePath("/agency");
  return ok(undefined);
}

/** Bulk-approve many work logs at once. */
export async function bulkApproveAction(workLogIds: string[]): Promise<ActionResult<{ count: number }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.APPROVE_WORKLOG)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const logs = await prisma.workLog.findMany({ where: { id: { in: workLogIds }, client: filter, approvalStatus: "PENDING" } });

  await prisma.$transaction([
    prisma.workLog.updateMany({ where: { id: { in: logs.map((l) => l.id) } }, data: { approvalStatus: "APPROVED" } }),
    ...logs.map((l) =>
      prisma.workLogApproval.create({ data: { workLogId: l.id, approverId: user.id, status: "APPROVED" } }),
    ),
  ]);

  for (const l of logs) {
    await recordAudit({
      organizationId: user.organizationId, actorId: user.id, action: "worklog.approve",
      entityType: "worklog", entityId: l.id, newValue: { decision: "APPROVED", bulk: true },
    });
  }
  revalidatePath("/work-logs");
  revalidatePath("/agency");
  return ok({ count: logs.length });
}
