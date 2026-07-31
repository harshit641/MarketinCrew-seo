"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

function ok<T>(data: T) {
  return { ok: true as const, data };
}
function err(message: string) {
  return { ok: false as const, error: message };
}
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function loginAction(
  prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ needsRedirect?: boolean }>> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return err("Email and password are required.");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  // Constant-ish failure path: always do a hash compare to reduce timing leakage.
  const dummyHash = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8WfV6aJ4l9.7Y7q2Y7q2Y7q2Y7q2Y";
  const valid = user?.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash);

  if (!user || !valid) return err("Invalid email or password.");
  if (user.status !== "ACTIVE") return err("This account has been disabled.");
  if (!user.organization) return err("Account is not linked to an organization.");

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await recordAudit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
  });

  return ok({ needsRedirect: true });
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
