# MarketinCrew SEO Command Center

An internal SEO operations platform for agencies — manage clients, plan and log daily SEO work, track keyword rankings, monitor backlinks and technical SEO, compare performance across date ranges, and generate professional client reports with PDF export.

Built on **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · PostgreSQL · Prisma 7**.

> **Status:** This is the **MVP** (Phase 1) — fully functional and tested. External API integrations (Google Search Console OAuth, GA4, PageSpeed, DataForSEO/Ahrefs) are architected behind provider interfaces and ship with a clearly-labelled demo adapter + CSV/manual import; live OAuth adapters are Phase 2+ behind feature flags.

---

## Quick start

### Prerequisites
- Node.js 20+ (built and tested on Node 22/24)
- PostgreSQL 14+ (local, Docker, or managed)
- npm

### 1. Install dependencies
```bash
npm install
```

### 2. Start PostgreSQL
**Option A — Docker (recommended):**
```bash
docker compose up -d postgres
```
**Option B — Homebrew (macOS):**
```bash
brew install postgresql@17
brew services start postgresql@17
createuser -s mkseo
createdb -O mkseo mkseo_dev
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` — the only values you **must** set:
- `DATABASE_URL` — your Postgres connection string
- `AUTH_SECRET` — generate with `openssl rand -base64 32`

The defaults in `.env.example` work out-of-the-box with the Docker/Homebrew setup above (`postgresql://mkseo:mkseo_dev_pw@localhost:5432/mkseo_dev`).

### 4. Create the database schema + load demo data
```bash
npm run db:migrate    # apply the schema
npm run seed          # load demo clients, users, keywords, rankings, work logs, a report
```

### 5. Run the app
```bash
npm run dev
```
Open **http://localhost:3000** and sign in with a demo account.

### Demo logins
All accounts use the password **`password123`**:

| Role | Email | Can access |
|------|-------|-----------|
| Super Admin | `admin@marketincrew.example` | Everything |
| SEO Manager | `manager@marketincrew.example` | Assigned clients, approvals, reports |
| SEO Executive | `exec1@marketincrew.example` | Assigned clients, own tasks & work logs |
| SEO Executive | `exec2@marketincrew.example` | Assigned clients, own tasks & work logs |
| Client Viewer | `viewer@acme.example` | Acme's portal (reports only) |

---

## Architecture

### Tech stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS v4, Recharts |
| UI primitives | Custom shadcn-style component library (`src/components/ui`) |
| Backend | Next.js Server Actions + Route Handlers |
| Database | PostgreSQL + Prisma 7 ORM (with `@prisma/adapter-pg`) |
| Auth | Session-based (httpOnly cookies, bcrypt, server-side sessions in DB) |
| PDF | `@react-pdf/renderer` |
| CSV | PapaParse |

### Project structure
```
src/
├── app/
│   ├── (auth)/            # Login page + auth server actions
│   ├── (app)/             # Authenticated app (sidebar shell)
│   │   ├── agency/        # Agency-wide dashboard
│   │   ├── clients/       # Client list, create, + [slug] workspace (14 tabs)
│   │   ├── tasks/         # Task list (list/kanban), create
│   │   ├── work-logs/     # Daily work logs + approval queue, multi-entry form
│   │   ├── rankings/      # Keyword DB + CSV import
│   │   ├── backlinks/     # Backlink tracking + CSV import
│   │   ├── reports/       # Report builder, PDF export, shared links
│   │   ├── team/          # Team performance dashboard
│   │   ├── search-console/ analytics/ technical/ content/ alerts/
│   │   ├── integrations/  # Provider connection status
│   │   ├── settings/      # Agency branding
│   │   └── audit-logs/    # Append-only audit trail
│   ├── reports/shared/    # Public client-facing report view (no auth)
│   └── api/templates/     # CSV template downloads
├── components/            # UI primitives, charts, KPI cards, layout shell
├── lib/
│   ├── auth/              # Sessions, RBAC permissions, client scoping
│   ├── queries/           # Scoped data-access layer (the security chokepoint)
│   ├── reports/           # Report data assembly + PDF document
│   ├── integrations/      # Provider interfaces + demo adapter + sync runner
│   ├── db.ts, crypto.ts, audit.ts, dates.ts, utils.ts, constants.ts
│   └── __tests__/         # Unit + integration tests
└── generated/prisma/      # Prisma client (gitignored, generated)
```

### Data model (30+ tables)
Core: `Organization → User → Employee → ClientAssignment → Client`
- **RBAC:** `User.role` (Super Admin / SEO Manager / SEO Executive / Client Viewer) → `permissions.ts` permission map → enforced server-side in every query.
- **Clients:** `Client` (soft-deleted via `deletedAt`) → `ClientGoal`, `Competitor`, `ClientIntegration`, `ClientMember` (portal access).
- **Work:** `Task` (categories, checklist, dependencies, templates) → `WorkLog` (one day's submission) → `WorkLogItem` (each activity) → `WorkLogApproval`.
- **Rankings:** `Keyword` (unique by client+keyword+geo+device) → `KeywordSnapshot` (historical, position 101 = not in top 100). **Never merged with Search Console average position.**
- **Snapshots:** `SearchConsoleSnapshot`, `AnalyticsSnapshot`, `LandingPageSnapshot`, `PageSpeedSnapshot`.
- **Links:** `Backlink` → `BacklinkCheck`.
- **Technical:** `TechnicalIssue`, `PageSpeedSnapshot`.
- **Reports:** `Report` → `ReportSection`, `ReportVersion`.
- **Ops:** `AlertEvent`, `AlertRule`, `Notification`, `SyncJob` → `SyncLog`, `Annotation`, `Attachment`, `Comment`, `AuditLog`.

Indexes are defined on every high-cardinality filter field (`clientId`, `date`, `status`, `keywordId`, `employeeId`, `approvalStatus`).

#### Entity-relationship diagram (text)
```
Organization 1───∞ User 1───1 Employee ──┐
                      │                   │
                      │              ClientAssignment
                      │                   │
                      ▼                   ▼
                   ClientMember ─── Client 1───∞ Task ───∞ WorkLogItem
                                    │  │  │           └───∞ WorkLog ─── WorkLogApproval
                          ┌─────────┘  │  │
                          ▼            ▼  ▼
                  ClientGoal   Competitor  ClientIntegration
                          │
                 Client 1───∞ Keyword 1───∞ KeywordSnapshot
                 Client 1───∞ Backlink ── BacklinkCheck
                 Client 1───∞ SearchConsoleSnapshot / AnalyticsSnapshot / PageSpeedSnapshot
                 Client 1───∞ TechnicalIssue / ContentPage
                 Client 1───∞ Report ─── ReportSection / ReportVersion
                 Client 1───∞ AlertEvent / Annotation
```
Browse the live schema visually with `npx prisma studio` or generate an ERD with `npx prisma-format`.

---

## Security model

- **Authentication:** session tokens are 256-bit random, stored server-side in `Session` (revocable, auto-expiring). Only the opaque token is sent in an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- **Authorization (RBAC):** role → permission map in `src/lib/auth/permissions.ts`. The sidebar hides links the user can't access, but **the server is the source of truth** — every data-access function in `src/lib/queries/` calls `getClientFilter(user)` to constrain queries.
- **Client-level isolation:** `resolveClientScope()` resolves which client IDs a user may touch (all / assigned / single portal client). Even routes that take a `clientId` from the URL re-filter through this set, so a user can't read another client's data by guessing an ID.
- **Credentials:** integration OAuth tokens / API keys are AES-256-GCM encrypted at rest (`src/lib/crypto.ts`), derived from `AUTH_SECRET`. They never reach the browser.
- **Audit log:** sensitive actions (login, client create/delete, integration connect/disconnect, work-log edit/approve, keyword/backlink delete, report approve/download, permission changes) are recorded in the append-only `AuditLog` with actor, action, entity, before/after values, and IP.
- **Input validation:** all server actions validate with Zod. File uploads are validated by MIME type.

---

## Key business rules enforced

- **Employees cannot submit work under another name** — the `employeeId` is always derived from the logged-in session, never from the form.
- **Ranking change = previous position − current position** (positive = improved). Position 101 displays as "Not in top 100", never as a normal rank.
- **Exact SERP rankings are stored separately from Search Console average position** — they're never combined.
- **Only approved work logs + completed tasks** appear in the report completed-work section by default.
- **Every chart states its data source**; every report states its period; every comparison states both date ranges.
- **Demo/mock data is always labelled** (`DEMO (mock) — not real data`) and never presented as live.
- **Performance metrics combine completion, timeliness, complexity and rework** — hours are shown for capacity context only.

---

## Daily workflows

### The end-to-end acceptance flow
1. Admin creates a client → assigns a manager + executive (Client → Settings → Team).
2. Manager creates monthly SEO tasks (Tasks → New).
3. Executive logs in, sees assigned work, submits a daily work log with evidence (Work Logs → New — add multiple activities).
4. Manager approves the work log (Work Logs → Approval Queue).
5. The activity appears on the client's work timeline and becomes report-eligible.
6. Admin imports keyword rankings for two dates (Client → Rankings → Import CSV).
7. The app computes and visualizes ranking changes.
8. Admin imports backlinks (Client → Backlinks → Import CSV).
9. Manager generates a monthly report (Reports → New), edits commentary, approves it.
10. Approved activities auto-populate the report; the report downloads as a branded PDF.
11. Client Viewer accesses only the approved report via a share link.
12. Every action above appears in the Audit Log.

---

## Data import (CSV)

The MVP is **provider-independent** — every dataset can be imported via CSV when no live API is connected.

| Dataset | Where | Template | Key columns |
|---------|-------|----------|-------------|
| Keywords | Client → Rankings → Import | `/api/templates/keywords.csv` | keyword, search_volume, difficulty, country, city, device, url, is_brand, intent, group, current_position |
| Ranking snapshots | Client → Rankings → Import (rankings tab) | `/api/templates/keywords.csv?type=rankings` | keyword, date, position, url, device, location |
| Backlinks | Client → Backlinks → Import | `/api/templates/backlinks.csv` | source_url, target_url, anchor_text, link_type, status, domain_rating, acquired |

Imports are **idempotent** — existing records (matched by unique key) are updated, new ones inserted, and a detailed summary (inserted/updated/skipped + per-row errors) is returned.

---

## API & integrations

The integration layer uses **provider adapters** so external SEO providers can change without rewriting the app:

```typescript
// src/lib/integrations/providers.ts
RankTrackingProvider    // DataForSEO, Ahrefs, Semrush, manual CSV
BacklinkProvider        // Ahrefs, manual CSV
TechnicalAuditProvider  // Screaming Frog, Ahrefs/Semrush Site Audit, custom CSV
SearchConsoleProvider   // Google Search Console (OAuth, Phase 2)
AnalyticsProvider       // GA4 Data API (Phase 2)
AIVisibilityProvider    // LLM visibility (Phase 4)
```

- **Phase 1 (now):** `DemoRankProvider`, `DemoSearchConsoleProvider`, etc. (clearly-labelled mock data) + CSV/manual import. Background sync runner (`InProcessSyncRunner`) with retry + exponential backoff + `SyncJob`/`SyncLog` records.
- **Phase 2 (next):** Live Google OAuth for Search Console + GA4, PageSpeed Insights, scheduled syncs, email notifications, scheduled reports, client portal polish, automated backlink checking.
- **Phase 3:** DataForSEO/Ahrefs live adapters, competitor visibility, technical audit integrations, local SEO, content decay, cannibalization, client health score, goal forecasting.
- **Phase 4:** AI-assisted reporting, LLM/AI-search visibility, resource forecasting, agency profitability, capacity planning, anomaly detection, Slack.

Feature flags (`FEATURE_*` env vars) gate each phase.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply schema migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:reset` | Drop & recreate schema (destructive) |
| `npm run db:studio` | Prisma Studio (DB GUI) |
| `npm run seed` | Load demo data |
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests (no DB needed) |
| `npm run test:integration` | Integration tests (needs DB) |
| `npm run smoke` | End-to-end smoke test (needs running dev server) |

---

## Testing

- **Unit tests** (`src/lib/__tests__/`): utilities, RBAC permission matrix, ranking-change formula, AES encryption round-trip. No database required.
- **Integration tests**: client-level data isolation (RBAC), keyword import idempotency, soft-delete scoping — against the real PostgreSQL.
- **Smoke test** (`npm run smoke`): boots against a running dev server and verifies auth redirects, every route renders, RBAC redirects executives, and the PDF generates with a valid header.

```bash
npm run test:unit        # 25 tests
npm run test:integration # 4 tests (needs DB + seed)
```

---

## Deployment

### Vercel (recommended)
1. Push to GitHub.
2. Import the repo in Vercel.
3. Add a PostgreSQL database (Vercel Postgres, Neon, or Supabase) and set `DATABASE_URL`.
4. Set `AUTH_SECRET` (`openssl rand -base64 32`).
5. Set the `FEATURE_*` flags as needed.
6. Deploy. Run `npm run db:migrate` + `npm run seed` once (via Vercel CLI or a one-off job) to create the schema and demo data.

### Docker
```bash
docker compose up -d postgres
docker build -t marketincrew-seo .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://mkseo:mkseo_dev_pw@host.docker.internal:5432/mkseo_dev \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  marketincrew-seo
```
The `Dockerfile` is a multi-stage build producing a lean standalone server image.

### Self-hosted (Node)
```bash
npm run build
npm run start
```
Run behind a reverse proxy (nginx/Caddy) that terminates TLS. Set `NODE_ENV=production` and a strong `AUTH_SECRET`.

---

## Known limitations (MVP scope)

- **No live OAuth yet:** GSC, GA4, PageSpeed, DataForSEO/Ahrefs require Phase 2. Until then, use CSV import or the clearly-labelled demo data.
- **No email delivery:** SMTP config is present but not wired to notification sending (Phase 2).
- **No Redis-backed queues:** the in-process sync runner handles jobs; swap in BullMQ+Redis later behind the same `SyncJobRunner` interface.
- **No client portal self-service:** Client Viewers see reports via share links; a full portal login flow is Phase 2.
- **No 2FA enforcement:** the `twoFactorEnabled` flag exists but TOTP enrolment is Phase 2.
- **Reports:** section reordering/drag-drop and AI-drafted commentary are stubbed for Phase 3/4.

---

## Recommended next phase

1. **Google Search Console OAuth** (highest value) — the provider interface and snapshot schema are ready.
2. **GA4 Data API** + conversion selection for reports.
3. **PageSpeed Insights** live adapter.
4. **Scheduled syncs + email notifications** (BullMQ + Redis + SMTP).
5. **Client portal** authentication.
6. **AI-assisted report commentary** (Phase 4) — always human-approved before delivery.

---

## License
Proprietary — MarketinCrew. All rights reserved.
