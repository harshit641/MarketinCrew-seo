"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getClientFilter } from "@/lib/auth/scoping";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/(auth)/actions";
import { TaskStatus, TaskPriority, TaskCategory } from "@/generated/prisma/enums";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

const taskSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(2, "Title is required."),
  category: z.nativeEnum(TaskCategory),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedMinutes: z.coerce.number().int().min(0).optional(),
  complexityPoints: z.coerce.number().int().min(0).default(1),
  isRecurring: z.coerce.boolean().default(false),
  recurrenceRule: z.string().optional(),
  relatedUrl: z.string().optional(),
  relatedKeyword: z.string().optional(),
});

export async function createTaskAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.CREATE_TASK)) return err("Not permitted to create tasks.");

  const parsed = taskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  // Verify client is in scope.
  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: d.clientId, ...filter } });
  if (!client) return err("Client not found or not accessible.");

  const task = await prisma.task.create({
    data: {
      clientId: d.clientId,
      title: d.title,
      category: d.category,
      description: d.description || null,
      priority: d.priority,
      status: d.status,
      createdById: user.id,
      ownerId: user.id,
      assigneeId: d.assigneeId || null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      estimatedMinutes: d.estimatedMinutes || null,
      complexityPoints: d.complexityPoints,
      isRecurring: d.isRecurring,
      recurrenceRule: d.recurrenceRule || null,
      relatedUrl: d.relatedUrl || null,
      relatedKeyword: d.relatedKeyword || null,
    },
  });

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "task.create",
    entityType: "task", entityId: task.id, newValue: { title: task.title, clientId: d.clientId },
  });
  revalidatePath("/tasks");
  revalidatePath(`/clients/${client.slug}/tasks`);
  return ok({ id: task.id });
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.UPDATE_TASK)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null, client: filter },
    include: { client: true },
  });
  if (!task) return err("Task not found.");

  await prisma.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === TaskStatus.DONE ? new Date() : null },
  });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "task.update_status",
    entityType: "task", entityId: taskId, newValue: { status },
  });
  revalidatePath("/tasks");
  revalidatePath(`/clients/${task.client.slug}/tasks`);
  return ok(undefined);
}

export async function updateTaskAction(taskId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.UPDATE_TASK)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const existing = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null, client: filter }, include: { client: true } });
  if (!existing) return err("Task not found.");

  const parsed = taskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: d.title,
      category: d.category,
      description: d.description || null,
      priority: d.priority,
      status: d.status,
      assigneeId: d.assigneeId || null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      estimatedMinutes: d.estimatedMinutes || null,
      complexityPoints: d.complexityPoints,
      isRecurring: d.isRecurring,
      recurrenceRule: d.recurrenceRule || null,
      relatedUrl: d.relatedUrl || null,
      relatedKeyword: d.relatedKeyword || null,
    },
  });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "task.update",
    entityType: "task", entityId: taskId,
  });
  revalidatePath("/tasks");
  revalidatePath(`/clients/${existing.client.slug}/tasks`);
  return ok(undefined);
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.DELETE_TASK)) return err("Not permitted.");

  const filter = await getClientFilter(user);
  const existing = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null, client: filter }, include: { client: true } });
  if (!existing) return err("Task not found.");

  await prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "task.delete",
    entityType: "task", entityId: taskId, previousValue: { title: existing.title },
  });
  revalidatePath("/tasks");
  revalidatePath(`/clients/${existing.client.slug}/tasks`);
  return ok(undefined);
}
