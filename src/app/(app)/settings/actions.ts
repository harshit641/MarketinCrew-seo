"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/(auth)/actions";

function ok(): ActionResult {
  return { ok: true, data: undefined };
}
function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

/**
 * Form-action wrapper (returns void) so it can be passed directly to a
 * <form action={...}> in a server component. Delegates to updateBrandingAction.
 */
export async function brandingFormAction(formData: FormData): Promise<void> {
  await updateBrandingAction(formData);
}

const brandingSchema = z.object({
  name: z.string().min(1),
  primaryColor: z.string().min(1),
  secondaryColor: z.string().min(1),
  reportFooter: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  emailSenderName: z.string().optional(),
  portalDomain: z.string().optional(),
});

export async function updateBrandingAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return err("You must be signed in.");
  if (!hasPermission(user.role, PERMISSIONS.MANAGE_BRANDING)) return err("Not permitted.");

  const parsed = brandingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  const d = parsed.data;

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      name: d.name,
      primaryColor: d.primaryColor,
      secondaryColor: d.secondaryColor,
      reportFooter: d.reportFooter || null,
      supportEmail: d.supportEmail || null,
      emailSenderName: d.emailSenderName || null,
      portalDomain: d.portalDomain || null,
    },
  });

  await recordAudit({
    organizationId: user.organizationId, actorId: user.id, action: "settings.update_branding",
    entityType: "organization", entityId: user.organizationId,
  });
  revalidatePath("/settings");
  return ok();
}
