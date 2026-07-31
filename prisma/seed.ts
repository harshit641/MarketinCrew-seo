/* eslint-disable */
/**
 * Seed script for MarketinCrew SEO Command Center.
 * Creates: 1 org, 4 users (admin, manager, 2 execs, 1 client viewer),
 * 2 demo clients with keywords, ranking history, tasks, work logs, backlinks,
 * technical issues, GSC/GA4 snapshots, alerts, and a report.
 *
 * Run: npm run seed
 * Idempotent-ish: deletes demo data first, recreates. Safe to re-run.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TaskCategory, TaskStatus, ApprovalStatus, SystemRole } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_ORG_SLUG = "marketincrew";
const PASSWORD = "password123";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAhead(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding MarketinCrew SEO Command Center…");

  // ---------------------------------------------------------------- Org
  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {
      name: "MarketinCrew",
      primaryColor: "#0f172a",
      secondaryColor: "#2563eb",
      reportFooter: "MarketinCrew — Data-driven SEO. marketincrew.example",
      supportEmail: "support@marketincrew.example",
      emailSenderName: "MarketinCrew",
    },
    create: {
      name: "MarketinCrew",
      slug: DEMO_ORG_SLUG,
      primaryColor: "#0f172a",
      secondaryColor: "#2563eb",
      reportFooter: "MarketinCrew — Data-driven SEO. marketincrew.example",
      supportEmail: "support@marketincrew.example",
      emailSenderName: "MarketinCrew",
    },
  });

  // ---------------------------------------------------------------- Users
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  async function upsertUser(opts: {
    email: string;
    name: string;
    role: SystemRole;
    jobTitle: string;
  }) {
    const u = await prisma.user.upsert({
      where: { email: opts.email },
      update: { name: opts.name, role: opts.role, status: "ACTIVE", organizationId: org.id },
      create: {
        email: opts.email,
        name: opts.name,
        role: opts.role,
        jobTitle: opts.jobTitle,
        status: "ACTIVE",
        passwordHash,
        organizationId: org.id,
      },
    });
    if (opts.role === "SEO_MANAGER" || opts.role === "SEO_EXECUTIVE" || opts.role === "INTERN") {
      await prisma.employee.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id, organizationId: org.id, weeklyCapacityMinutes: 1800, hireDate: daysAgo(365) },
      });
    }
    return u;
  }

  const admin = await upsertUser({ email: "admin@marketincrew.example", name: "Alex Admin", role: SystemRole.SUPER_ADMIN, jobTitle: "Director of SEO" });
  const manager = await upsertUser({ email: "manager@marketincrew.example", name: "Maya Manager", role: SystemRole.SEO_MANAGER, jobTitle: "Senior SEO Manager" });
  const exec1 = await upsertUser({ email: "rutik@marketincrew.example", name: "Rutik", role: SystemRole.SEO_EXECUTIVE, jobTitle: "SEO Executive" });
  const exec2 = await upsertUser({ email: "yash@marketincrew.example", name: "Yash", role: SystemRole.SEO_EXECUTIVE, jobTitle: "SEO Executive" });
  const exec3 = await upsertUser({ email: "arshita@marketincrew.example", name: "Arshita", role: SystemRole.SEO_EXECUTIVE, jobTitle: "SEO Executive" });
  const intern = await upsertUser({ email: "neer@marketincrew.example", name: "Neer", role: SystemRole.INTERN, jobTitle: "SEO Intern" });
  const viewer = await upsertUser({ email: "viewer@acme.example", name: "Vikram Client", role: SystemRole.CLIENT_VIEWER, jobTitle: "Marketing Lead, Acme" });

  const empManager = await prisma.employee.findUniqueOrThrow({ where: { userId: manager.id } });
  const empExec1 = await prisma.employee.findUniqueOrThrow({ where: { userId: exec1.id } });
  const empExec2 = await prisma.employee.findUniqueOrThrow({ where: { userId: exec2.id } });
  const empExec3 = await prisma.employee.findUniqueOrThrow({ where: { userId: exec3.id } });
  const empIntern = await prisma.employee.findUniqueOrThrow({ where: { userId: intern.id } });

  // ---------------------------------------------------------------- Clients
  async function createClient(opts: {
    name: string;
    domain: string;
    industry: string;
    country: string;
    city: string;
    competitors: string[];
    keywordSeeds: { kw: string; vol: number; diff: number; brand: boolean; intent: string }[];
  }) {
    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: opts.name,
        slug: slug(opts.name),
        websiteUrl: `https://${opts.domain}`,
        primaryDomain: opts.domain,
        industry: opts.industry,
        country: opts.country,
        city: opts.city,
        timezone: "Asia/Kolkata",
        startDate: daysAgo(180),
        contractStatus: "ACTIVE",
        servicePackage: "Growth SEO Retainer",
        monthlyReportDay: 1,
        primaryContact: "Marketing Director",
        contactEmail: `marketing@${opts.domain}`,
        targetLocations: [opts.city, opts.country],
        targetLanguages: ["en"],
        competitorDomains: opts.competitors,
        reportingCurrency: "INR",
        clientGoalsText: "Grow non-brand organic traffic and top-10 keyword count quarter over quarter.",
        isDemo: true,
      },
    });

    // Assignments
    await prisma.clientAssignment.create({ data: { clientId: client.id, employeeId: empManager.id, role: SystemRole.SEO_MANAGER } });
    await prisma.clientAssignment.create({ data: { clientId: client.id, employeeId: empExec1.id, role: SystemRole.SEO_EXECUTIVE } });

    // Competitors
    for (const c of opts.competitors) {
      await prisma.competitor.create({ data: { clientId: client.id, domain: c, name: c } });
    }

    // Keywords + 4 months of weekly snapshots with a gradual upward trend
    let idx = 0;
    for (const seed of opts.keywordSeeds) {
      const baseline = 35 + (idx % 7) * 11; // start mid-pack
      const keyword = await prisma.keyword.create({
        data: {
          clientId: client.id,
          keyword: seed.kw,
          searchIntent: seed.intent as any,
          targetUrl: `https://${opts.domain}/${slug(seed.kw)}`,
          country: opts.country,
          city: opts.city,
          device: "DESKTOP",
          searchEngine: "google",
          isBrand: seed.brand,
          isPrimary: !seed.brand,
          searchVolume: seed.vol,
          difficulty: seed.diff,
          baselinePosition: baseline,
          currentPosition: Math.max(2, baseline - (idx % 5) * 4 - 3),
          bestPosition: Math.max(2, baseline - (idx % 5) * 4 - 5),
          trackingStatus: "ACTIVE",
          priority: seed.brand ? 2 : 4,
          dateAdded: daysAgo(150),
        },
      });
      // weekly snapshots: gradual improvement with some noise
      for (let w = 16; w >= 0; w--) {
        const trend = (16 - w) * 0.9; // improves over time
        const noise = (idx % 3) - 1;
        const pos = Math.min(101, Math.max(1, Math.round(baseline - trend + noise)));
        await prisma.keywordSnapshot.create({
          data: {
            keywordId: keyword.id,
            clientId: client.id,
            date: daysAgo(w * 7),
            position: pos,
            rankingUrl: `https://${opts.domain}/${slug(seed.kw)}`,
            device: "DESKTOP",
            dataProvider: "DEMO",
          },
        });
      }
      idx++;
    }

    // Search Console + Analytics daily snapshots (3 months, aggregated)
    for (let d = 90; d >= 0; d--) {
      const date = daysAgo(d);
      const growth = (90 - d) / 90;
      const clicks = Math.round((800 + idx * 40) * (0.6 + growth * 0.9) + (Math.sin(d) * 50));
      const impressions = Math.round(clicks * (12 + (d % 5)));
      await prisma.searchConsoleSnapshot.create({
        data: {
          clientId: client.id, date, query: "demo aggregated", clicks, impressions,
          ctr: impressions ? +(clicks / impressions).toFixed(4) : 0, position: +(8 + (d % 4)).toFixed(1),
          device: "desktop", isBranded: false, dataProvider: "DEMO",
        },
      });
      await prisma.analyticsSnapshot.create({
        data: {
          clientId: client.id, date,
          sessions: Math.round(clicks * 1.4),
          users: Math.round(clicks * 1.1),
          newUsers: Math.round(clicks * 0.7),
          conversions: Math.round(clicks * 0.03),
          conversionRate: 0.03, sourceMedium: "google / organic",
          dataProvider: "DEMO",
        },
      });
    }

    // Landing pages
    for (let i = 0; i < 5; i++) {
      await prisma.landingPageSnapshot.create({
        data: {
          clientId: client.id, date: daysAgo(0),
          page: `https://${opts.domain}/service-${i + 1}`,
          clicks: 120 - i * 15, impressions: 2400 - i * 200, ctr: 0.05, position: 6.5 + i, sessions: 90, conversions: 3,
          dataProvider: "DEMO",
        },
      });
    }

    return client;
  }

  // Clean prior demo data to keep re-runs stable
  await prisma.client.deleteMany({ where: { organizationId: org.id, isDemo: true } });

  const acme = await createClient({
    name: "Acme Roofing Co",
    domain: "acmeroofing.example",
    industry: "Home Services",
    country: "IN",
    city: "Mumbai",
    competitors: ["roofs-r-us.example", "mumbairoofpros.example"],
    keywordSeeds: [
      { kw: "roof repair mumbai", vol: 1900, diff: 42, brand: false, intent: "COMMERCIAL" },
      { kw: "roof leak repair", vol: 3600, diff: 48, brand: false, intent: "COMMERCIAL" },
      { kw: "best roofing company mumbai", vol: 880, diff: 39, brand: false, intent: "COMMERCIAL" },
      { kw: "flat roof installation", vol: 1300, diff: 45, brand: false, intent: "COMMERCIAL" },
      { kw: "acme roofing", vol: 720, diff: 5, brand: true, intent: "NAVIGATIONAL" },
      { kw: "roof maintenance cost", vol: 590, diff: 33, brand: false, intent: "INFORMATIONAL" },
      { kw: "tile roof replacement", vol: 480, diff: 36, brand: false, intent: "COMMERCIAL" },
      { kw: "gutter cleaning mumbai", vol: 1100, diff: 28, brand: false, intent: "COMMERCIAL" },
    ],
  });

  const lumen = await createClient({
    name: "Lumen Fitness",
    domain: "lumenfitness.example",
    industry: "Health & Fitness",
    country: "IN",
    city: "Bengaluru",
    competitors: ["fitlife.example", "bengalurugym.example"],
    keywordSeeds: [
      { kw: "gym membership bengaluru", vol: 2600, diff: 44, brand: false, intent: "COMMERCIAL" },
      { kw: "personal trainer bengaluru", vol: 1500, diff: 41, brand: false, intent: "COMMERCIAL" },
      { kw: "best gym in bengaluru", vol: 2100, diff: 50, brand: false, intent: "COMMERCIAL" },
      { kw: "online fitness coaching", vol: 4400, diff: 55, brand: false, intent: "COMMERCIAL" },
      { kw: "lumen fitness", vol: 640, diff: 4, brand: true, intent: "NAVIGATIONAL" },
      { kw: "weight loss program", vol: 6600, diff: 60, brand: false, intent: "INFORMATIONAL" },
      { kw: "strength training near me", vol: 1900, diff: 38, brand: false, intent: "COMMERCIAL" },
    ],
  });

  // Assign exec2 to lumen too
  await prisma.clientAssignment.create({ data: { clientId: lumen.id, employeeId: empExec2.id, role: SystemRole.SEO_EXECUTIVE } });
  // Arshita (exec3) and Neer (intern) also help on both clients
  await prisma.clientAssignment.create({ data: { clientId: acme.id, employeeId: empExec3.id, role: SystemRole.SEO_EXECUTIVE } });
  await prisma.clientAssignment.create({ data: { clientId: lumen.id, employeeId: empExec3.id, role: SystemRole.SEO_EXECUTIVE } });
  await prisma.clientAssignment.create({ data: { clientId: acme.id, employeeId: empIntern.id, role: SystemRole.INTERN } });

  // Client viewer portal membership (for Acme)
  await prisma.clientMember.upsert({
    where: { clientId_userId: { clientId: acme.id, userId: viewer.id } },
    update: {},
    create: { clientId: acme.id, userId: viewer.id },
  });

  // ---------------------------------------------------------------- Tasks
  const taskDefs: Array<[string, TaskCategory, TaskStatus, string, number]> = [
    // title, category, status, assigneeUserId, dueOffsetDays
    ["Technical SEO audit (full crawl)", TaskCategory.TECHNICAL_SEO, TaskStatus.DONE, exec1.id, -30],
    ["Fix missing meta descriptions on service pages", TaskCategory.ON_PAGE_SEO, TaskStatus.IN_PROGRESS, exec1.id, 3],
    ["Publish blog: 'How to Spot Roof Damage'", TaskCategory.CONTENT_WRITING, TaskStatus.IN_REVIEW, exec1.id, 2],
    ["Build 3 guest post backlinks", TaskCategory.BACKLINK_BUILDING, TaskStatus.IN_PROGRESS, exec1.id, 7],
    ["Optimize /roof-repair-mumbai for 'roof repair mumbai'", TaskCategory.CONTENT_OPTIMIZATION, TaskStatus.DONE, exec1.id, -10],
    ["Add LocalBusiness schema", TaskCategory.SCHEMA_MARKUP, TaskStatus.TODO, exec1.id, 5],
    ["Internal linking pass — service pages", TaskCategory.INTERNAL_LINKING, TaskStatus.AWAITING_APPROVAL, exec1.id, 1],
  ];
  for (const [title, cat, status, assigneeId, dueOffset] of taskDefs) {
    await prisma.task.create({
      data: {
        clientId: acme.id,
        title,
        category: cat,
        status,
        createdById: manager.id,
        assigneeId,
        ownerId: manager.id,
        priority: status === TaskStatus.DONE ? "MEDIUM" : "HIGH",
        startDate: daysAgo(20),
        dueDate: dueOffset >= 0 ? daysAhead(dueOffset) : daysAgo(-dueOffset),
        completedAt: status === TaskStatus.DONE ? daysAgo(5) : null,
        estimatedMinutes: 240,
        actualApprovedMinutes: status === TaskStatus.DONE ? 220 : null,
        complexityPoints: 3,
        approvalStatus: status === TaskStatus.AWAITING_APPROVAL ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED,
      },
    });
  }

  // Lumen tasks (exec2)
  await prisma.task.create({
    data: {
      clientId: lumen.id, title: "Refresh homepage copy for conversions", category: TaskCategory.CONTENT_OPTIMIZATION,
      status: TaskStatus.IN_PROGRESS, createdById: manager.id, assigneeId: exec2.id, ownerId: manager.id,
      priority: "HIGH", startDate: daysAgo(8), dueDate: daysAhead(4), estimatedMinutes: 180, complexityPoints: 2,
    },
  });

  // Arshita (exec3) tasks across both clients — including website edit tasks
  await prisma.task.create({
    data: {
      clientId: acme.id, title: "Update contact page with new phone number", category: TaskCategory.WEBSITE_IMPLEMENTATION,
      status: TaskStatus.DONE, createdById: manager.id, assigneeId: exec3.id, ownerId: manager.id,
      priority: "HIGH", startDate: daysAgo(12), dueDate: daysAgo(2), completedAt: daysAgo(3),
      estimatedMinutes: 60, actualApprovedMinutes: 55, complexityPoints: 1,
    },
  });
  await prisma.task.create({
    data: {
      clientId: lumen.id, title: "Add new class schedule page", category: TaskCategory.WEBSITE_IMPLEMENTATION,
      status: TaskStatus.IN_PROGRESS, createdById: manager.id, assigneeId: exec3.id, ownerId: manager.id,
      priority: "MEDIUM", startDate: daysAgo(5), dueDate: daysAhead(6), estimatedMinutes: 240, complexityPoints: 3,
    },
  });

  // Neer (intern) tasks — supervised work
  await prisma.task.create({
    data: {
      clientId: acme.id, title: "Competitor backlink research (Q3)", category: TaskCategory.COMPETITOR_RESEARCH,
      status: TaskStatus.IN_REVIEW, createdById: manager.id, assigneeId: intern.id, ownerId: manager.id,
      priority: "LOW", startDate: daysAgo(7), dueDate: daysAhead(2), estimatedMinutes: 180, complexityPoints: 2,
    },
  });
  await prisma.task.create({
    data: {
      clientId: acme.id, title: "Draft 3 meta descriptions for service pages", category: TaskCategory.CONTENT_WRITING,
      status: TaskStatus.TODO, createdById: manager.id, assigneeId: intern.id, ownerId: manager.id,
      priority: "MEDIUM", startDate: daysAgo(2), dueDate: daysAhead(3), estimatedMinutes: 90, complexityPoints: 1,
    },
  });

  // ---------------------------------------------------------------- Work logs
  async function createWorkLog(clientId: string, empUserId: string, empId: string, dayOffset: number, approved: boolean) {
    const wl = await prisma.workLog.create({
      data: {
        clientId,
        employeeId: empId,
        userId: empUserId,
        date: daysAgo(dayOffset),
        status: "COMPLETED",
        approvalStatus: approved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
        submittedAt: daysAgo(dayOffset),
        isDraft: false,
        totalMinutes: 180,
        billableMinutes: 180,
        items: {
          create: [
            {
              category: TaskCategory.CONTENT_OPTIMIZATION,
              workCompleted: "Optimized title tag, meta description and H1 for the target service page. Added internal links.",
              deliverable: "Updated /roof-repair-mumbai",
              urlWorkedOn: `https://acmeroofing.example/roof-repair-mumbai`,
              keywordWorkedOn: "roof repair mumbai",
              minutesSpent: 120,
              status: "COMPLETED",
              clientVisibleSummary: "Improved on-page SEO for the roof repair service page.",
              billable: true,
            },
            {
              category: TaskCategory.BACKLINK_BUILDING,
              workCompleted: "Outreached to 5 home-improvement blogs; received 1 positive reply.",
              deliverable: "Outreach tracker updated",
              minutesSpent: 60,
              status: "ONGOING",
              clientVisibleSummary: "Ongoing outreach for new referring domains.",
              billable: true,
            },
          ],
        },
      },
    });
    if (approved) {
      await prisma.workLogApproval.create({
        data: { workLogId: wl.id, approverId: manager.id, status: ApprovalStatus.APPROVED, note: "Looks good." },
      });
    }
    return wl;
  }

  await createWorkLog(acme.id, exec1.id, empExec1.id, 1, true);
  await createWorkLog(acme.id, exec1.id, empExec1.id, 2, true);
  await createWorkLog(acme.id, exec1.id, empExec1.id, 0, false); // pending approval
  await createWorkLog(lumen.id, exec2.id, empExec2.id, 1, false);
  // Arshita + Neer work logs
  await createWorkLog(acme.id, exec3.id, empExec3.id, 1, true);
  await createWorkLog(lumen.id, exec3.id, empExec3.id, 2, false);
  await createWorkLog(acme.id, intern.id, empIntern.id, 1, false);

  // ---------------------------------------------------------------- Backlinks
  const backlinkDefs = [
    ["https://homeblog.example/roof-care", "homeblog.example", "https://acmeroofing.example/roof-repair-mumbai", "roof repair tips", "DOFOLLOW", "GUEST_POST", 45],
    ["https://diyforum.example/t/3456", "diyforum.example", "https://acmeroofing.example/", "Acme Roofing", "NOFOLLOW", "OUTREACH", 22],
    ["https://news.example/home-improvement-2024", "news.example", "https://acmeroofing.example/services", "best roofers", "DOFOLLOW", "DIGITAL_PR", 68],
  ];
  for (const [src, srcDom, tgt, anchor, type, method, dr] of backlinkDefs) {
    await prisma.backlink.create({
      data: {
        clientId: acme.id, sourceUrl: src as string, sourceDomain: srcDom as string, targetUrl: tgt as string,
        anchorText: anchor as string, linkType: type as any, status: "LIVE", httpStatus: 200,
        firstSeenAt: daysAgo(40), acquiredAt: daysAgo(30), lastCheckedAt: daysAgo(2),
        domainRating: dr as number, referringDomain: srcDom as string, ownerId: exec1.id,
        linkBuildingMethod: method as string, campaign: "Q3 Authority Building", approvalStatus: "APPROVED",
      },
    });
  }
  // one lost backlink for alerts
  await prisma.backlink.create({
    data: {
      clientId: acme.id, sourceUrl: "https://oldlistings.example/roofs", sourceDomain: "oldlistings.example",
      targetUrl: "https://acmeroofing.example/", anchorText: "roofers mumbai", linkType: "DOFOLLOW",
      status: "LOST", httpStatus: 404, firstSeenAt: daysAgo(90), acquiredAt: daysAgo(80), lostAt: daysAgo(5),
      lastCheckedAt: daysAgo(5), domainRating: 30, referringDomain: "oldlistings.example", ownerId: exec1.id,
      linkBuildingMethod: "DIRECTORY", approvalStatus: "APPROVED",
    },
  });

  // ---------------------------------------------------------------- Technical issues
  const issues = [
    ["https://acmeroofing.example/services", "Missing meta description", "HIGH", "Add a unique meta description (140-160 chars)."],
    ["https://acmeroofing.example/blog/old-post", "Broken internal link", "MEDIUM", "Found 3 links pointing to removed pages."],
    ["https://acmeroofing.example/contact", "Slow LCP (mobile)", "HIGH", "Largest Contentful Paint is 4.2s. Optimize hero image."],
    ["https://acmeroofing.example/", "Duplicate title tag", "MEDIUM", "Homepage title duplicated on 2 pagination URLs."],
  ];
  for (const [url, cat, sev, fix] of issues) {
    await prisma.technicalIssue.create({
      data: {
        clientId: acme.id, url: url as string, category: cat as string, severity: sev as any,
        description: cat as string, recommendedFix: fix as string, status: "OPEN",
        source: "MANUAL", firstSeenAt: daysAgo(15), lastSeenAt: daysAgo(1),
      },
    });
  }

  // PageSpeed snapshot
  await prisma.pageSpeedSnapshot.create({
    data: {
      clientId: acme.id, url: "https://acmeroofing.example/", device: "MOBILE", date: daysAgo(2),
      performance: 62, accessibility: 88, bestPractices: 90, seo: 92, lcp: 4200, inp: 280, cls: 0.12,
      fcp: 1800, speedIndex: 3800, tbt: 600, dataProvider: "PAGESPEED",
    },
  });

  // ---------------------------------------------------------------- Goals
  await prisma.clientGoal.create({
    data: {
      clientId: acme.id, type: "IMPROVE_TOP10_KEYWORDS", title: "Reach 15 keywords in top 10",
      baselineValue: 6, targetValue: 15, currentValue: 9, unit: "keywords", status: "ON_TRACK",
      startDate: daysAgo(90), endDate: daysAhead(90), ownerId: manager.id,
    },
  });
  await prisma.clientGoal.create({
    data: {
      clientId: acme.id, type: "INCREASE_ORGANIC_CLICKS", title: "Grow organic clicks by 40%",
      baselineValue: 18000, targetValue: 25200, currentValue: 22100, unit: "clicks", status: "ON_TRACK",
      startDate: daysAgo(90), endDate: daysAhead(0), ownerId: manager.id,
    },
  });

  // ---------------------------------------------------------------- Alerts
  await prisma.alertEvent.create({ data: { clientId: acme.id, category: "LOST_BACKLINK", severity: "WARNING", message: "Lost 1 backlink from oldlistings.example (404).", status: "ACTIVE" } });
  await prisma.alertEvent.create({ data: { clientId: acme.id, category: "TECHNICAL_DECLINE", severity: "WARNING", message: "2 new high-severity technical issues detected.", status: "ACTIVE" } });
  await prisma.alertEvent.create({ data: { clientId: lumen.id, category: "REPORT_DUE", severity: "INFO", message: "Monthly report due in 3 days.", status: "ACTIVE" } });

  // ---------------------------------------------------------------- Integrations (demo)
  await prisma.clientIntegration.upsert({
    where: { clientId_provider: { clientId: acme.id, provider: "GOOGLE_SEARCH_CONSOLE" } },
    update: { status: "CONNECTED", label: "acmeroofing.example", lastSyncAt: daysAgo(1) },
    create: { clientId: acme.id, provider: "GOOGLE_SEARCH_CONSOLE", status: "CONNECTED", label: "acmeroofing.example", lastSyncAt: daysAgo(1) },
  });
  await prisma.clientIntegration.upsert({
    where: { clientId_provider: { clientId: acme.id, provider: "PAGESPEED" } },
    update: { status: "CONNECTED", lastSyncAt: daysAgo(2) },
    create: { clientId: acme.id, provider: "PAGESPEED", status: "CONNECTED", lastSyncAt: daysAgo(2) },
  });
  await prisma.clientIntegration.upsert({
    where: { clientId_provider: { clientId: acme.id, provider: "GA4" } },
    update: { status: "ERROR", lastError: "Refresh token expired — re-authenticate.", lastSyncAttemptAt: daysAgo(3) },
    create: { clientId: acme.id, provider: "GA4", status: "ERROR", lastError: "Refresh token expired — re-authenticate.", lastSyncAttemptAt: daysAgo(3) },
  });

  // ---------------------------------------------------------------- Report
  const periodEnd = daysAgo(1);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 29);
  const report = await prisma.report.create({
    data: {
      clientId: acme.id, type: "MONTHLY", status: "DRAFT", title: "Acme Roofing — Monthly SEO Report",
      periodStart, periodEnd, createdById: manager.id, isClientFacing: true, includeApprovedOnly: true,
      executiveSummary: "Organic performance continued to improve this month. Top-10 keyword count grew from 6 to 9, and organic clicks are tracking 23% above baseline. Two high-severity technical issues need attention.",
      keyWins: "- 3 new keywords entered the top 10.\n- Gained 2 strong referring domains (DR 45 and DR 68).\n- 'roof repair mumbai' improved from #14 to #6.",
      issuesRisks: "- Lost 1 referring domain (oldlistings.example returned 404).\n- Mobile LCP on homepage is 4.2s.\n- GA4 integration token expired.",
      recommendations: "- Reclaim or replace the lost backlink.\n- Optimize the homepage hero image to improve LCP.\n- Re-authenticate GA4 to restore conversion tracking.",
      nextMonthPlan: "- Publish 2 new service-area pages.\n- Build 3 additional referring domains.\n- Fix all open high-severity technical issues.",
      sections: {
        create: [
          { type: "COVER", title: "Cover", order: 0 },
          { type: "REPORTING_PERIOD", title: "Reporting Period", order: 1 },
          { type: "EXECUTIVE_SUMMARY", title: "Executive Summary", order: 2 },
          { type: "KEY_KPI", title: "Key SEO KPIs", order: 3 },
          { type: "ORGANIC_SEARCH_CONSOLE", title: "Organic Clicks & Impressions", order: 4 },
          { type: "KEYWORD_RANKING_SUMMARY", title: "Keyword Ranking Summary", order: 5 },
          { type: "RANKING_DISTRIBUTION", title: "Ranking Distribution", order: 6 },
          { type: "TOP_RANKING_IMPROVEMENTS", title: "Top Ranking Improvements", order: 7 },
          { type: "BACKLINK_SUMMARY", title: "Backlink Summary", order: 8 },
          { type: "TECHNICAL_SEO_SUMMARY", title: "Technical SEO Summary", order: 9 },
          { type: "TASKS_COMPLETED", title: "Tasks Completed", order: 10 },
          { type: "WORK_BY_CATEGORY", title: "Work Completed by Category", order: 11 },
          { type: "KEY_WINS", title: "Key Wins", order: 12 },
          { type: "ISSUES_RISKS", title: "Issues & Risks", order: 13 },
          { type: "RECOMMENDATIONS", title: "Recommendations", order: 14 },
          { type: "NEXT_MONTH_PLAN", title: "Next Month's Plan", order: 15 },
          { type: "METHODOLOGY", title: "Methodology & Data Sources", order: 16 },
        ],
      },
    },
  });

  // ---------------------------------------------------------------- Audit log entries
  await prisma.auditLog.createMany({
    data: [
      { organizationId: org.id, actorId: admin.id, action: "seed.run", entityType: "system", newValue: { ts: new Date().toISOString() } },
      { organizationId: org.id, actorId: admin.id, action: "client.create", entityType: "client", entityId: acme.id, newValue: { name: "Acme Roofing Co" } },
      { organizationId: org.id, actorId: admin.id, action: "client.create", entityType: "client", entityId: lumen.id, newValue: { name: "Lumen Fitness" } },
    ],
  });

  console.log("\n✅ Seed complete.");
  console.log("────────────────────────────────────────");
  console.log("Demo logins (password for all): " + PASSWORD);
  console.log("  Super Admin   : admin@marketincrew.example");
  console.log("  SEO Manager   : manager@marketincrew.example");
  console.log("  SEO Executive : rutik@marketincrew.example");
  console.log("  SEO Executive : yash@marketincrew.example");
  console.log("  SEO Executive : arshita@marketincrew.example");
  console.log("  Intern        : neer@marketincrew.example");
  console.log("  Client Viewer : viewer@acme.example");
  console.log("────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
