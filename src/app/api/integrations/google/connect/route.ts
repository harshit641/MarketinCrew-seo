import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientFilter } from "@/lib/auth/scoping";
import { prisma } from "@/lib/db";
import { getAuthUrl, isGoogleConfigured } from "@/lib/integrations/google";

/**
 * Starts the Google OAuth flow. The `client` query param identifies which
 * client the connection is for; it's passed through as OAuth state and
 * verified against the user's scope on callback.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_BASE in .env. See the Integrations page for setup steps." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client");
  if (!clientId) return NextResponse.json({ error: "Missing client id" }, { status: 400 });

  // Verify the client is in the user's scope before starting OAuth.
  const filter = await getClientFilter(user);
  const client = await prisma.client.findFirst({ where: { id: clientId, ...filter }, select: { slug: true } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // State = clientId|orgId, signed loosely by including both; callback re-checks scope.
  const state = `${clientId}|${user.organizationId}`;
  const url = getAuthUrl(state);
  return NextResponse.redirect(url);
}
