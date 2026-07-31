"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { SystemRole } from "@/generated/prisma/enums";
import type { ActionResult } from "@/app/(auth)/actions";

function ok<T>(data: T) {
  return { ok: true as const, data };
}
function err(message: string): ActionResult<never> {
  return { ok: false as const, error: message };
}

const clientSchema = z.object({
  name: z.string().min(2, "Client name is required."),
  websiteUrl: z.string().url("Enter a valid website URL."),
  industry: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().default("UTC"),
  primaryDomain: z.string().optional(),
  primaryContact: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contractStatus: z.enum(["ACTIVE", "PAUSED", "ENDED", "PROSPECT"]).default("ACTIVE"),
  servicePackage: z.string().optional(),
  monthlyReportDay: z.coerce.number().int().min(1).max(28).default(1),
  targetLocations: z.string().optional(),
  competitorDomains: z.string().optional(),
  clientGoalsText: z.string().optional(),
  startDate: z.string().optional(),
});

export type ClientInput = z.input<typeof clientSchema>;

export async function createClientAction(
  prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.CREATE_CLIENT)) {
    return err("You do not have permission to create clients.");
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const d = parsed.data;

  const slug = slugify(d.name);
  const exists = await prisma.client.findUnique({ where: { organizationId_slug: { organizationId: user.organizationId, slug } } });
  if (exists) return err(`A client with slug "${slug}" already exists. Rename it.`);

  const competitorDomains = (d.competitorDomains ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const targetLocations = (d.targetLocations ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const client = await prisma.client.create({
    data: {
      organizationId: user.organizationId,
      name: d.name,
      slug,
      websiteUrl: d.websiteUrl,
      industry: d.industry || null,
      country: d.country || null,
      city: d.city || null,
      timezone: d.timezone,
      primaryDomain: d.primaryDomain || domainFromUrl(d.websiteUrl),
      primaryContact: d.primaryContact || null,
      contactEmail: d.contactEmail || null,
      contractStatus: d.contractStatus,
      servicePackage: d.servicePackage || null,
      monthlyReportDay: d.monthlyReportDay,
      targetLocations,
      competitorDomains,
      clientGoalsText: d.clientGoalsText || null,
      startDate: d.startDate ? new Date(d.startDate) : new Date(),
    },
  });

  await recordAudit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
    newValue: { name: client.name, slug },
  });

  revalidatePath("/clients");
  revalidatePath("/agency");
  return ok({ slug: client.slug });
}

export async function updateClientAction(clientId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.UPDATE_CLIENT)) return err("Not permitted.");

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing || existing.organizationId !== user.organizationId) return err("Client not found.");

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  const competitorDomains = (d.competitorDomains ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const targetLocations = (d.targetLocations ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: d.name,
      websiteUrl: d.websiteUrl,
      industry: d.industry || null,
      country: d.country || null,
      city: d.city || null,
      timezone: d.timezone,
      primaryDomain: d.primaryDomain || domainFromUrl(d.websiteUrl),
      primaryContact: d.primaryContact || null,
      contactEmail: d.contactEmail || null,
      contractStatus: d.contractStatus,
      servicePackage: d.servicePackage || null,
      monthlyReportDay: d.monthlyReportDay,
      targetLocations,
      competitorDomains,
      clientGoalsText: d.clientGoalsText || null,
    },
  });

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "client.update",
    entityType: "client", entityId: clientId,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${existing.slug}`);
  return ok(undefined);
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.DELETE_CLIENT)) return err("Not permitted.");

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing || existing.organizationId !== user.organizationId) return err("Client not found.");

  // Soft delete to preserve historical data / audit integrity.
  await prisma.client.update({ where: { id: clientId }, data: { deletedAt: new Date(), contractStatus: "ENDED" } });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "client.delete",
    entityType: "client", entityId: clientId, previousValue: { name: existing.name },
  });
  revalidatePath("/clients");
  revalidatePath("/agency");
  return ok(undefined);
}

export async function assignTeamMemberAction(
  clientId: string,
  employeeId: string,
  role: SystemRole,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.ASSIGN_TEAM)) return err("Not permitted.");

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.organizationId !== user.organizationId) return err("Client not found.");

  await prisma.clientAssignment.upsert({
    where: { clientId_employeeId: { clientId, employeeId } },
    update: { role },
    create: { clientId, employeeId, role },
  });
  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "client.assign",
    entityType: "client", entityId: clientId, newValue: { employeeId, role },
  });
  revalidatePath(`/clients/${client.slug}`);
  return ok(undefined);
}

export async function removeAssignmentAction(clientId: string, employeeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.ASSIGN_TEAM)) return err("Not permitted.");
  await prisma.clientAssignment.deleteMany({ where: { clientId, employeeId } });
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (client) revalidatePath(`/clients/${client.slug}`);
  return ok(undefined);
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
