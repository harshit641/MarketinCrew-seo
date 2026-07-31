import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight edge proxy (formerly "middleware" in Next.js <= 15).
 * It only checks for the *presence* of a session cookie to avoid hitting the
 * database on every request. The real authentication + authorization happens
 * server-side in each route via getCurrentUser() / requirePermission() /
 * assertClientAccess().
 *
 * This keeps protected routes from flashing their content before redirect.
 */

const PUBLIC_PATHS = ["/login", "/api/auth", "/reports/shared"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths + Next internals.
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/storage")
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get("mk_session")?.value);
  if (!hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
