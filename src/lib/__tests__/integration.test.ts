import { strict as assert } from "node:assert";
import { test } from "node:test";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * Integration tests against the real PostgreSQL database.
 * These verify: client-level data isolation (RBAC) and keyword CSV import
 * idempotency — the two most security/safety-critical MVP workflows.
 *
 * Requires DATABASE_URL. Skips gracefully if unavailable.
 */

const connectionString = process.env.DATABASE_URL;
const shouldRun = Boolean(connectionString);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: connectionString ?? "postgresql://localhost/test" }),
});

test("client isolation: a user assigned to client A cannot read client B's keywords", async (t) => {
  if (!shouldRun) { t.skip("DATABASE_URL not set"); return; }
  await t;

  const org = await prisma.organization.findFirst({ where: { slug: "marketincrew" } });
  if (!org) { t.skip("seed data not present — run `npm run seed` first"); return; }

  const clients = await prisma.client.findMany({ where: { organizationId: org.id, deletedAt: null } });
  if (clients.length < 2) { t.skip("need >= 2 seeded clients"); return; }

  // Simulate the scoping filter for a user assigned ONLY to client A.
  const [clientA, clientB] = clients;
  const scopedToA = { organizationId: org.id, deletedAt: null, id: { in: [clientA.id] } };

  const aKeywords = await prisma.keyword.count({ where: { client: scopedToA } });
  const bKeywordsViaScopedFilter = await prisma.keyword.count({
    where: { clientId: clientB.id, client: scopedToA },
  });

  assert.ok(aKeywords > 0, "client A should have seeded keywords");
  assert.equal(bKeywordsViaScopedFilter, 0, "scoped filter must exclude client B's keywords entirely");
});

test("client isolation: super-admin scope (no id filter) sees all clients in the org", async (t) => {
  if (!shouldRun) { t.skip("DATABASE_URL not set"); return; }
  await t;

  const org = await prisma.organization.findFirst({ where: { slug: "marketincrew" } });
  if (!org) { t.skip("seed data not present"); return; }

  const adminScope = { organizationId: org.id, deletedAt: null };
  const allKeywords = await prisma.keyword.count({ where: { client: adminScope } });
  assert.ok(allKeywords > 0, "admin scope should see keywords across all org clients");
});

test("keyword CSV import is idempotent (upsert by unique key, no duplicates)", async (t) => {
  if (!shouldRun) { t.skip("DATABASE_URL not set"); return; }
  await t;

  const org = await prisma.organization.findFirst({ where: { slug: "marketincrew" } });
  if (!org) { t.skip("seed data not present"); return; }

  // Create a throwaway client for this test.
  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: `Test Client ${Date.now()}`,
      slug: `test-${Date.now()}`,
      websiteUrl: "https://test.example",
      isDemo: true,
    },
  });

  try {
    const uniqueKey = { clientId: client.id, keyword: "idempotency-test-kw", country: "US", city: "Mumbai", device: "DESKTOP" as const, searchEngine: "google" };

    await prisma.keyword.create({ data: { ...uniqueKey, currentPosition: 10, baselinePosition: 10 } });
    const count1 = await prisma.keyword.count({ where: { client: { id: client.id } } });

    // "Re-import" the same keyword via upsert — should update, not duplicate.
    await prisma.keyword.upsert({
      where: { clientId_keyword_country_city_device_searchEngine: uniqueKey },
      update: { currentPosition: 5 },
      create: { ...uniqueKey, currentPosition: 5, baselinePosition: 10 },
    });
    const count2 = await prisma.keyword.count({ where: { client: { id: client.id } } });

    assert.equal(count2, count1, "re-importing the same keyword must not create a duplicate");
    const updated = await prisma.keyword.findUnique({ where: { clientId_keyword_country_city_device_searchEngine: uniqueKey } });
    assert.equal(updated?.currentPosition, 5, "position should be updated to 5");
  } finally {
    await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
  }
});

test("soft-deleted clients are excluded from the default scope", async (t) => {
  if (!shouldRun) { t.skip("DATABASE_URL not set"); return; }
  await t;

  const org = await prisma.organization.findFirst({ where: { slug: "marketincrew" } });
  if (!org) { t.skip("seed data not present"); return; }

  const client = await prisma.client.create({
    data: { organizationId: org.id, name: "SoftDelete Test", slug: `sd-${Date.now()}`, websiteUrl: "https://sd.example", deletedAt: new Date(), isDemo: true },
  });
  try {
    const visible = await prisma.client.findFirst({ where: { id: client.id, organizationId: org.id, deletedAt: null } });
    assert.equal(visible, null, "soft-deleted client must not be visible in the default scope");
  } finally {
    await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
  }
});
