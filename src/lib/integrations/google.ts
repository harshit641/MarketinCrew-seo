import "server-only";
import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import { encrypt, decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { IntegrationProvider, IntegrationStatus } from "@/generated/prisma/enums";

/**
 * ===========================================================================
   Google Search Console OAuth integration.

   Flow:
   1. getAuthUrl()  → redirect the user to Google's consent screen.
   2. exchangeCode() → Google redirects back with a code; we exchange it for
      access + refresh tokens, which we store ENCRYPTED on the ClientIntegration.
   3. getAuthenticatedClient() → builds an OAuth2Client with the stored (decrypted)
      token, auto-refreshing when it expires.
   4. listSites() / fetchPerformance() → pull real GSC data.

   Tokens NEVER reach the browser. Refresh tokens are encrypted at rest.
   ===========================================================================
 */

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  // analytics.readonly is requested up-front so GA4 can be connected later
  // without a second consent round-trip.
  "https://www.googleapis.com/auth/analytics.readonly",
];

function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET);
}

/** The redirect URI must match exactly what's registered in Google Cloud Console. */
export function getRedirectUrl(): string {
  const base = process.env.GOOGLE_REDIRECT_BASE || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/google/callback`;
}

export function getAuthUrl(state: string): string {
  if (!isConfigured()) {
    throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_BASE in .env");
  }
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    getRedirectUrl(),
  );
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force consent so we always get a refresh token
    scope: SCOPES,
    state,
  });
}

interface StoredToken {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
}

/** Exchange the authorization code for tokens and store them encrypted on the integration. */
export async function exchangeAndStoreCode(clientId: string, code: string): Promise<void> {
  if (!isConfigured()) throw new Error("Google OAuth not configured.");
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    getRedirectUrl(),
  );
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke app access in your Google account and try again, or ensure prompt=consent is used.");
  }
  const payload: StoredToken = {
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  };

  await prisma.clientIntegration.upsert({
    where: { clientId_provider: { clientId, provider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE } },
    update: {
      status: IntegrationStatus.CONNECTED,
      encryptedCredentials: encrypt(JSON.stringify(payload)),
      lastError: null,
    },
    create: {
      clientId,
      provider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE,
      status: IntegrationStatus.CONNECTED,
      encryptedCredentials: encrypt(JSON.stringify(payload)),
    },
  });
}

/** Build an OAuth2 client for a connected integration, refreshing as needed. */
export async function getAuthenticatedClient(clientId: string): Promise<OAuth2Client | null> {
  if (!isConfigured()) return null;
  const integration = await prisma.clientIntegration.findUnique({
    where: { clientId_provider: { clientId, provider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE } },
  });
  if (!integration || !integration.encryptedCredentials) return null;

  let token: StoredToken;
  try {
    token = JSON.parse(decrypt(integration.encryptedCredentials));
  } catch {
    return null;
  }

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    getRedirectUrl(),
  );
  client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  });

  // If the access token is near expiry, refresh it and persist the new token.
  const expired = !token.expiry_date || token.expiry_date < Date.now() + 60_000;
  if (expired && token.refresh_token) {
    try {
      const { credentials } = await client.refreshAccessToken();
      const refreshed: StoredToken = {
        access_token: credentials.access_token ?? undefined,
        refresh_token: credentials.refresh_token ?? token.refresh_token,
        expiry_date: credentials.expiry_date ?? undefined,
      };
      client.setCredentials(credentials);
      await prisma.clientIntegration.update({
        where: { id: integration.id },
        data: { encryptedCredentials: encrypt(JSON.stringify(refreshed)), lastSyncAttemptAt: new Date() },
      });
    } catch {
      await prisma.clientIntegration.update({
        where: { id: integration.id },
        data: { status: IntegrationStatus.EXPIRED, lastError: "Token refresh failed — re-authenticate." },
      });
      return null;
    }
  }
  return client;
}

/** List the Search Console properties the connected account has access to. */
export async function listSearchConsoleSites(clientId: string): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const client = await getAuthenticatedClient(clientId);
  if (!client) return [];
  const webmasters = google.webmasters({ version: "v3", auth: client });
  const res = await webmasters.sites.list({});
  return (res.data.siteEntry ?? []).map((s) => ({
    siteUrl: s.siteUrl ?? "",
    permissionLevel: s.permissionLevel ?? "",
  }));
}

export interface GscPerformanceRow {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  query?: string | null;
  page?: string | null;
  device?: string | null;
  country?: string | null;
}

/**
 * Fetch Search Console performance for a property over a date range.
 * The GSC API caps at 50,000 rows per page; we page through by query dimension.
 */
export async function fetchSearchConsolePerformance(
  clientId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 1000,
): Promise<GscPerformanceRow[]> {
  const client = await getAuthenticatedClient(clientId);
  if (!client) return [];
  const searchconsole = google.searchconsole({ version: "v1", auth: client });

  // The Search Console API takes siteUrl as a path param + a requestBody.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date", "query", "page", "device", "country"],
      rowLimit,
    },
  });

  const rows: any[] = res?.data?.rows ?? [];
  return rows.map((r) => ({
    date: (r.keys?.[0] ?? startDate) as string,
    query: r.keys?.[1] ?? null,
    page: r.keys?.[2] ?? null,
    device: r.keys?.[3] ?? null,
    country: r.keys?.[4] ?? null,
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

export { isConfigured as isGoogleConfigured };
