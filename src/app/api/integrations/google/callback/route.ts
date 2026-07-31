import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { exchangeAndStoreCode } from "@/lib/integrations/google";
import { recordAudit } from "@/lib/audit";

/**
 * OAuth callback. Google redirects here with ?code=...&state=...
 * We exchange the code for tokens and store them encrypted, then redirect
 * back to the client's Search Console tab.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/clients?google_error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/clients?google_error=no_code", req.url));
  }

  const [clientId] = state.split("|");
  if (!clientId) {
    return NextResponse.redirect(new URL("/clients?google_error=bad_state", req.url));
  }

  // Re-verify the client is still in scope (defense in depth).
  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter }, select: { slug: true } });
  if (!client) {
    return NextResponse.redirect(new URL("/clients?google_error=client_not_found", req.url));
  }

  try {
    await exchangeAndStoreCode(clientId, code);
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "integration.connect",
      entityType: "client_integration",
      entityId: clientId,
      newValue: { provider: "GOOGLE_SEARCH_CONSOLE" },
    });
    return NextResponse.redirect(new URL(`/clients/${client.slug}/search-console?google=connected`, req.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/clients/${client.slug}/search-console?google_error=${encodeURIComponent(e.message)}`, req.url));
  }
}
