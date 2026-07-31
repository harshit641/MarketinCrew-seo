import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { SystemRole } from "@/generated/prisma/enums";

/**
 * ===========================================================================
 * Session-based authentication.
 *
 * - Password: bcryptjs.
 * - Session token: 32 random bytes, base64. Stored server-side in Session
 *   table with expiry; only the opaque token is sent to the browser in an
 *   httpOnly, Secure, SameSite=Lax cookie.
 * - Sessions are revocable (delete the row) and expire automatically.
 *
 * This is deliberately dependency-light (no NextAuth) so the full auth flow
 * (login, logout, current user, permission checks) is auditable in one place.
 * ===========================================================================
 */

const SESSION_COOKIE = "mk_session";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function generateToken(): string {
  return randomBytes(32).toString("base64");
}

function hashToken(token: string): string {
  // We store the token directly (it is already high-entropy) but compare with
  // timingSafeEqual at read time. Tokens are 256-bit so brute force is infeasible.
  return token;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  organizationId: string;
  status: string;
}

export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const maxAge = Number(process.env.SESSION_MAX_AGE ?? DEFAULT_MAX_AGE);
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  const hdrs = await headers();
  const ipAddress =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    undefined;
  const userAgent = hdrs.get("user-agent") ?? undefined;

  await prisma.session.create({
    data: {
      userId,
      token: hashToken(token),
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token: hashToken(token) } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (safeEqual(session.token, hashToken(token)) === false) return null;

  const user = session.user;
  if (user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    status: user.status,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Throwing here triggers the error boundary / redirect in the layout layer.
    throw new UnauthenticatedError();
  }
  return user;
}

export async function requirePermission(
  permission: Parameters<typeof import("@/lib/auth/permissions")["hasPermission"]>[1],
): Promise<SessionUser> {
  const user = await requireUser();
  const { hasPermission } = await import("@/lib/auth/permissions");
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return user;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("You must be signed in to view this page.");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
