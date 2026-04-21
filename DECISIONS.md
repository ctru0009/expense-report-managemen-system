# DECISIONS.md

## Stack Choice

**Node.js over Go/Java/.NET:** The spec lists all as acceptable. Node wins here because: (1) one language across the stack reduces context-switching in a time-boxed exercise, (2) Prisma is the most productive TypeScript ORM available — no Go or Java ORM matches its developer experience for schema-first modeling, and (3) Express + TypeScript is fast to scaffold with minimal boilerplate. Go would be a better choice for raw throughput or concurrency, but this domain is CRUD-heavy with no performance-sensitive paths.

**Express over Fastify/NestJS:** Fastify is faster at the benchmark level but the difference is irrelevant at this scale. NestJS over-engineers a 6-hour project with decorators, modules, and DI ceremony. Express with a clean folder structure achieves the same separation of concerns with less abstraction.

**Prisma over TypeORM:** Prisma's schema-first approach (`schema.prisma` → generated client) produces type-safe queries with zero boilerplate. TypeORM's decorator-based entities and `find*` methods require more code for the same result, and its migration story is less reliable. For a domain with clear relationships (User → Report → Item) and computed fields, Prisma's transaction API is cleaner.

**React over Vue:** Both are listed in the spec. React was chosen because the component model (JSX) maps more naturally to the Stitch-exported HTML prototypes — copy-paste HTML into JSX, add state. Vue's template syntax adds a translation step. For an exercise where speed matters, less translation = fewer bugs.

**Vite over Create React App / Webpack:** CRA is deprecated. Webpack configs are a time sink. Vite needs zero config for React + TypeScript and starts instantly.

**Tailwind CSS:** Eliminates the naming/organization decisions of traditional CSS. For a 6-hour exercise, not debating BEM vs CSS Modules vs styled-components is a real time saving. The Stitch design system's tonal palette maps directly to Tailwind custom colors.

## Key Design Decisions

### 1. REJECTED → DRAFT via Explicit Reopen Action

When an admin rejects a report, the user must click **"Reopen to Draft"** before they can edit items. The transition REJECTED → DRAFT is a deliberate user action, not implicit on first edit.

**Why:** The spec diagram shows REJECTED → DRAFT as a distinct arrow, implying a deliberate action. Making it explicit means the user acknowledges the rejection and consciously decides to rework the report. An implicit flip (editing an item auto-transitions to DRAFT) risks accidental state changes — a user browsing a rejected report shouldn't silently change its status.

**Trade-off:** This adds one extra endpoint (`POST /api/reports/:id/reopen`) and one extra button in the UI. Worth it for clarity.

### 2. AI Extraction: Synchronous / Immediate

Receipt extraction runs synchronously during the upload request. The endpoint accepts the file, sends it to the LLM, and returns extracted fields in the response.

**Why:** For this scope, receipts are small files and LLM extraction typically completes in 2-5 seconds. A polling/async approach adds complexity (job queue, status polling, WebSocket) that isn't justified for the exercise. The frontend shows a loading spinner during upload.

**If I had more time:** I'd use a job queue (Redis + BullMQ) for async processing with a polling endpoint, especially for batch uploads or larger documents.

### 3. Total Amount: Stored + Recomputed

`ExpenseReport.totalAmount` is a stored column, not a virtual/computed property. It gets recomputed inside a Prisma transaction whenever an expense item is added, modified, or deleted.

**Why:** Stored totals avoid N+1 queries when listing reports with amounts. The transaction ensures consistency. For this scale, the overhead of recomputing on every change is negligible.

### 4. Single Currency Display

Items store a `currency` field (ISO 4217), but the report `totalAmount` is a single numeric sum without currency conversion. All items are assumed to be in the same currency for this scope.

**Why:** Multi-currency conversion requires an exchange rate service and adds significant complexity. The schema supports future expansion — the `currency` field exists on items.

### 5. Admin User via Seed Script

Admin users are created via `npm run prisma:seed`. There's no admin registration endpoint.

**Why:** In production, admin provisioning would be gated behind an invite/permissions system. For this exercise, a seed script is sufficient and avoids complexity.

### 6. Categories: Fixed Enum

Expense categories are an enum in Prisma: `TRAVEL`, `MEALS`, `OFFICE_SUPPLIES`, `SOFTWARE`, `HARDWARE`, `MARKETING`, `OTHER`.

**Why:** A fixed set is simpler and enables filtering. User-defined categories would need a separate table and CRUD — out of scope.

### 7. No Pagination

List endpoints return all results. No `?page=` or `?limit=` parameters.

**Why:** This is a demo with seed data — there won't be thousands of records. Pagination adds backend query logic, frontend page controls, and testing surface that doesn't demonstrate architectural judgment. The "one more day" section already calls it out as the first thing to add for production.

### 8. Single JWT Token (No Refresh)

One JWT with a 7-day expiry stored in localStorage. No refresh token rotation.

**Why:** Access + refresh adds a `/auth/refresh` endpoint, token rotation, expiry tracking, and frontend interceptor logic. For a take-home exercise where the only consumer is one browser tab, the security trade-off of a long-lived token is acceptable. A real system would use httpOnly cookies + short-lived access tokens.

### 9. Monorepo Without Workspace Tooling

Backend and frontend are separate directories with their own `package.json` files, managed independently. No Lerna, Nx, or Turborepo.

**Why:** For a 2-app project, workspace tooling adds configuration overhead with no real benefit. Docker Compose handles orchestration.

## 10. Docker Compose: Health Check for Postgres Startup

The backend `depends_on` Postgres with `condition: service_healthy` using a `pg_isready` health check, not just a bare `depends_on`.

**Why:** A bare `depends_on` only waits for the container process to start — it does not wait for Postgres to finish initialization and accept connections. On a fresh volume (first `docker-compose up`), Postgres runs `initdb`, creates the database, then restarts. The backend's `prisma migrate deploy` would race ahead and fail with `P1001: Can't reach database server`. The health check ensures the backend only starts once Postgres is truly ready.

**Trade-off:** Adds ~5s to startup on fresh volumes while the health check polls. Negligible on subsequent starts.

## 11. Docker Compose: OpenSSL in Alpine Image

The backend Dockerfile installs `openssl` via `apk add --no-cache openssl` before `npm ci`.

**Why:** Prisma's query engine is a native binary that links against `libssl`. The `node:20-alpine` image ships without OpenSSL, causing `prisma migrate deploy` to crash at runtime with `Error: Could not parse schema engine response`. This is a known Prisma-on-Alpine issue.

---

## If I Had One More Day

I would prioritize in this order:

1. **Background job queue for receipt processing** (Redis + BullMQ). This is the highest-value architectural improvement. Currently, receipt extraction blocks the HTTP request. With a job queue, uploads return immediately, the frontend polls for results, and we can handle failures gracefully with retries. This also unlocks batch receipt uploads — a real user need when expense reports contain 10-20 receipts.

2. **Audit trail for status transitions**. A `StatusHistory` table recording `who`, `from_status`, `to_status`, `timestamp`, and optional `reason`. This is critical for real expense systems — approvers need to see the timeline, and compliance teams need an immutable record. It would be surfaced in the admin report detail view as a timeline component.

3. **Pagination and sorting on all list endpoints**. Currently lists return everything. For a real system with thousands of reports, cursor-based pagination and sortable columns are essential. This is a straightforward backend change but requires thoughtful frontend UX (infinite scroll vs. page controls).

4. **Confidence scores on AI extraction**. Display per-field confidence from the LLM response and let users see which fields are uncertain. This builds trust in the AI feature — users are more likely to accept suggestions when they can see the model's certainty level.

5. **Error monitoring and structured logging** (Winston or Pino with request correlation IDs). The current error handling is adequate for development but wouldn't survive production. Structured logs with request IDs make debugging user-reported issues tractable.

These are ordered by the ratio of user value to implementation effort. The job queue delivers the most architectural improvement per hour invested. The audit trail is the most important "missing feature" from a business perspective — real expense systems live and die by their audit records.
