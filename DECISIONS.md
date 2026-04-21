# DECISIONS.md

## Stack Choice

**Node.js over Go/Java/.NET:** The spec lists all as acceptable. Node wins here because: (1) one language across the stack reduces context-switching in a time-boxed exercise, (2) Prisma is the most productive TypeScript ORM available — no Go or Java ORM matches its developer experience for schema-first modeling, and (3) Express + TypeScript is fast to scaffold with minimal boilerplate. Go would be a better choice for raw throughput or concurrency, but this domain is CRUD-heavy with no performance-sensitive paths.

**Express over Fastify/NestJS:** Fastify is faster at the benchmark level but the difference is irrelevant at this scale. NestJS over-engineers a 6-hour project with decorators, modules, and DI ceremony. Express with a clean folder structure achieves the same separation of concerns with less abstraction.

**Prisma over TypeORM:** Prisma's schema-first approach (`schema.prisma` → generated client) produces type-safe queries with zero boilerplate. TypeORM's decorator-based entities and `find*` methods require more code for the same result, and its migration story is less reliable. For a domain with clear relationships (User → Report → Item) and computed fields, Prisma's transaction API is cleaner.

**React over Vue:** Both are listed in the spec. React was chosen because the component model (JSX) maps more naturally to the Stitch-exported HTML prototypes — copy-paste HTML into JSX, add state. Vue's template syntax adds a translation step. For an exercise where speed matters, less translation = fewer bugs.

**Vite over Create React App / Webpack:** CRA is deprecated. Webpack configs are a time sink. Vite needs zero config for React + TypeScript and starts instantly.

**Tailwind CSS:** Eliminates the naming/organization decisions of traditional CSS. For a 6-hour exercise, not debating BEM vs CSS Modules vs styled-components is a real time saving. The Stitch design system's tonal palette maps directly to Tailwind custom colors.

## Key Design Decisions

### 1. REJECTED → DRAFT via Explicit Reopen, Edit Rights in REJECTED

When an admin rejects a report, two things happen simultaneously:
1. The user **regains edit rights** immediately — they can add/edit/delete items and update report metadata without any extra step.
2. To **re-submit** the report, the user must click "Reopen to Draft" first, which transitions REJECTED → DRAFT, and then submit again.

**Why:** The assessment spec states: *"REJECTED — set by admin. User regains edit rights and can re-submit."* Allowing immediate edit access in REJECTED matches the spec's intent — the user shouldn't be blocked from fixing their report. However, re-submission requires a deliberate reopen action so the user consciously acknowledges the rejection before sending it back for review.

This is implemented via:
- `canEditItems(status)`: returns `true` for DRAFT and REJECTED
- `canEditMetadata(status)`: returns `true` for DRAFT and REJECTED
- `canDelete(status)`: returns `true` for DRAFT only (deleting a rejected report is destructive; reopen first)
- `transition()`: REJECTED → DRAFT requires explicit `reopen`; no REJECTED → SUBMITTED shortcut

**Trade-off:** Two-step re-submit (reopen → submit) rather than one-step. The explicit reopen prevents accidental re-submission and gives the user a clear checkpoint.

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

### 7. Stitch Prototype Artifacts Are Not Product Requirements

Some Stitch mockups include illustrative UI artifacts that are not meant to become real behavior, such as the signup role selector.

**Why:** The mockups are quick visual specs, not authoritative business logic. In the actual product, roles are not chosen during signup; admin access is seeded and controlled server-side. This keeps the implementation aligned with security rules instead of copying accidental prototype details.

### 8. No Pagination

List endpoints return all results. No `?page=` or `?limit=` parameters.

**Why:** This is a demo with seed data — there won't be thousands of records. Pagination adds backend query logic, frontend page controls, and testing surface that doesn't demonstrate architectural judgment. The "one more day" section already calls it out as the first thing to add for production.

### 9. Single JWT Token (No Refresh)

One JWT with a 7-day expiry stored in localStorage. No refresh token rotation.

**Why:** Access + refresh adds a `/auth/refresh` endpoint, token rotation, expiry tracking, and frontend interceptor logic. For a take-home exercise where the only consumer is one browser tab, the security trade-off of a long-lived token is acceptable. A real system would use httpOnly cookies + short-lived access tokens.

### 10. Monorepo Without Workspace Tooling

Backend and frontend are separate directories with their own `package.json` files, managed independently. No Lerna, Nx, or Turborepo.

**Why:** For a 2-app project, workspace tooling adds configuration overhead with no real benefit. Docker Compose handles orchestration.

## 11. Docker Compose: Health Check for Postgres Startup

The backend `depends_on` Postgres with `condition: service_healthy` using a `pg_isready` health check, not just a bare `depends_on`.

**Why:** A bare `depends_on` only waits for the container process to start — it does not wait for Postgres to finish initialization and accept connections. On a fresh volume (first `docker-compose up`), Postgres runs `initdb`, creates the database, then restarts. The backend's `prisma migrate deploy` would race ahead and fail with `P1001: Can't reach database server`. The health check ensures the backend only starts once Postgres is truly ready.

**Trade-off:** Adds ~5s to startup on fresh volumes while the health check polls. Negligible on subsequent starts.

## 12. Docker Compose: OpenSSL in Alpine Image

The backend Dockerfile installs `openssl` via `apk add --no-cache openssl` before `npm ci`.

**Why:** Prisma's query engine is a native binary that links against `libssl`. The `node:20-alpine` image ships without OpenSSL, causing `prisma migrate deploy` to crash at runtime with `Error: Could not parse schema engine response`. This is a known Prisma-on-Alpine issue.

## 13. Multi-model Workflow: Claude + GPT for Different Task Types

**When:** Phase 2 implementation, parallel backend/frontend agents

**Context:** Running two parallel Claude Code agents (backend + frontend) hit rate limits mid-phase. Rather than waiting, routed mechanical tasks to a lighter model.

**Decision:** Claude for architecture, business logic, and judgment-heavy implementation. GPT-5.4-mini for commit message generation and file scaffolding when Claude was rate-limited.

**Why:** Not all tasks require the same model. Commit messages and boilerplate don't need deep context — they need speed. Reserving Claude capacity for state machine logic, Zod validation, and AI extraction prompt engineering is the right trade-off.

**What I'd do differently at scale:** Set up model routing upfront rather than reactively — define task categories and assign models before hitting limits mid-flow.

## 14. Phase 3a: Report and Item Service Design Decisions

### Shared `findOwnedReport` Utility

Both `ReportService` and `ItemService` use a shared `findOwnedReport(prisma, reportId, userId, include?)` helper that fetches a report, verifies existence, and checks ownership. It accepts an optional Prisma `include` parameter to avoid separate queries when the caller needs related data (e.g., items).

**Why:** Originally duplicated between modules, then refactored into `report.utils.ts`. The `include` param was added to eliminate a double-query in `getById()` — a single call to `findOwnedReport(prisma, id, userId, { items: true })` returns the report with items in one round trip.

**Trade-off:** The utility is in the reports module. If more modules need ownership-gated queries, it should move to `common/access.ts`. For now, the cross-module import is acceptable.

### Report Metadata Edits Allowed in REJECTED Status

The `PUT /api/reports/:id` endpoint allows updating `title` and `description` when the report status is REJECTED, matching the behavior for items (`canEditItems` also returns `true` for REJECTED).

**Why:** The assessment spec explicitly states "user regains edit rights" on rejection. This applies to both items and metadata — a user reviewing a rejected report should be able to revise title, description, and items before deciding to reopen and resubmit.

### Block Empty Report Submission

The `submit()` endpoint returns a `ValidationError` if the report has zero expense items.

**Why:** Submitting an empty expense report has no domain value — it's just noise for admins to review. This is a business rule that makes sense for the domain, even though it wasn't explicitly in the requirements. The validation lives in the service layer because it requires a database query to check item count.

**Trade-off:** Extra validation rule not in original spec. However, the rule is obvious in hindsight and prevents meaningless submissions.

### Nested Item Routes with Defense-in-Depth

Item routes are mounted at `/api/reports/:reportId/items`, and the service verifies that each item actually belongs to the specified report (e.g., checking `existingItem.reportId !== reportId`).

**Why:** Items have no independent existence — every item operation requires the parent report's context (for ownership checks, DRAFT status validation, and total recomputation). Nesting the routes makes this relationship explicit in the URL structure. The extra `reportId` check in the service is defense-in-depth: even if a client manipulates the URL to target an item on a different report, the database query will fail.

**Trade-off:** One extra check per item mutation. Negligible performance cost for stronger security.

### `transactionDate` as `z.string().datetime()`

The Zod schema uses `z.string().datetime()` for `transactionDate`, not `z.date()`.

**Why:** Express's `express.json()` middleware parses request bodies into plain JavaScript objects — ISO date strings remain as strings, not `Date` objects. Using `z.string().datetime()` validates the ISO 8601 format at the route level, then the service converts to a `Date` object for Prisma.

**Trade-off:** Type conversion happens in the service layer rather than the route layer. This is a common Express/JSON pattern.

### State Machine as Single Source of Truth

All status-dependent behavior flows through `report-state-machine.ts`. Service functions call `transition()`, `canEditItems()`, `canEditMetadata()`, and `canDelete()` instead of checking `report.status` directly. The state machine throws `StateTransitionError` (mapped to HTTP 400) and `ValidationError` (also 400) rather than plain `Error` (which would map to 500).

**Why:** Centralizing status logic in one module ensures consistency and makes transitions auditable. If a new status (e.g., `IN_REVIEW`) is added, only the state machine and its tests need updating — service code remains unchanged.

## 15. Phase 3b: Frontend Report UI Decisions

### Sidebar Layout Introduced in Phase 3b

The app layout now uses a persistent sidebar (256px, `bg-surface-container-high`) for all authenticated routes, matching the Stitch design prototypes. Auth pages (login/signup) remain full-screen.

**Why:** The Stitch designs consistently show a sidebar across all report screens. Introducing it now ensures every subsequent page (admin, etc.) has the same shell without rework. The sidebar includes navigation links, a "New Report" CTA, and user info — the shared frame for the entire authenticated experience.

**Trade-off:** The sidebar is hidden on mobile (`hidden md:flex`). A mobile-responsive hamburger menu is deferred — the assessment targets desktop use.

### Report Create as Page, Not Modal

The Stitch `my_reports` design shows a modal for creating reports. We implement it as a dedicated page at `/reports/new` instead.

**Why:** Modals add state management complexity (open/close, backdrop, focus trap) for marginal UX benefit. A page route is simpler, supports direct URL navigation, and works naturally with browser back button. The form is simple enough that a modal's "in-context" feel isn't necessary.

**Trade-off:** One extra navigation away from the report list. Acceptable for a form with only 2 fields.

### Stats Cards Derived Client-Side

The 4 summary cards on the report list (Total Outstanding, Draft count, In Review count, Approved YTD) are computed from the fetched report list, not from a dedicated API endpoint.

**Why:** There's no backend aggregation endpoint, and adding one would require a new route and service method for data that's already available client-side. The dataset is small (no pagination per architecture decision #8), so computing sums and counts in JS is negligible.

**Trade-off:** If the dataset grows significantly, this approach won't scale. The fix is straightforward — add a `/api/reports/stats` endpoint and swap the client-side computation.

### Item Form Modal Without AI Receipt Section

The `ItemFormModal` implements the form fields from the Stitch `add_expense_item_ai_extracted` design but omits the receipt upload preview and AI extraction banner. Those will be added in Phase 4.

**Why:** The receipt upload requires multer configuration, file storage, and the OpenAI integration — all Phase 4 scope. Building the modal now with just the form fields means Phase 4 only needs to add the receipt section above the existing form, not rebuild the whole modal.

**Trade-off:** The item form looks simpler than the Stitch design until Phase 4. The form is fully functional for manual entry in the meantime.

### Decorative Search Input

The top bar search input is rendered but read-only. It doesn't filter reports.

**Why:** The backend has no search endpoint, and the architecture doesn't call for one. Rendering it visually matches the Stitch design without wiring up dead functionality.

---

## If I Had One More Day

I would prioritize in this order:

1. **Background job queue for receipt processing** (Redis + BullMQ). This is the highest-value architectural improvement. Currently, receipt extraction blocks the HTTP request. With a job queue, uploads return immediately, the frontend polls for results, and we can handle failures gracefully with retries. This also unlocks batch receipt uploads — a real user need when expense reports contain 10-20 receipts.

2. **Audit trail for status transitions**. A `StatusHistory` table recording `who`, `from_status`, `to_status`, `timestamp`, and optional `reason`. This is critical for real expense systems — approvers need to see the timeline, and compliance teams need an immutable record. It would be surfaced in the admin report detail view as a timeline component.

3. **Pagination and sorting on all list endpoints**. Currently lists return everything. For a real system with thousands of reports, cursor-based pagination and sortable columns are essential. This is a straightforward backend change but requires thoughtful frontend UX (infinite scroll vs. page controls).

4. **Confidence scores on AI extraction**. Display per-field confidence from the LLM response and let users see which fields are uncertain. This builds trust in the AI feature — users are more likely to accept suggestions when they can see the model's certainty level.

5. **Error monitoring and structured logging** (Winston or Pino with request correlation IDs). The current error handling is adequate for development but wouldn't survive production. Structured logs with request IDs make debugging user-reported issues tractable.

These are ordered by the ratio of user value to implementation effort. The job queue delivers the most architectural improvement per hour invested. The audit trail is the most important "missing feature" from a business perspective — real expense systems live and die by their audit records.
