# DECISIONS.md

Every decision below follows the same format: **What** we did, **Why** we did it, and the **Trade-off** we accepted. Items are grouped by domain so a reader can find relevant context quickly.

---

## Stack Choices

The stack was chosen for speed in a time-boxed exercise — one language across the stack, minimal configuration, and productive tooling.

### 1. Node.js + Express

**What:** Node.js backend with Express (not Fastify or NestJS).

**Why:** One language across the full stack reduces context-switching. Express with a clean folder structure achieves separation of concerns without NestJS's decorator/DI ceremony. Fastify's benchmark advantage is irrelevant at this scale.

**Trade-off:** Express has no built-in schema validation or dependency injection — we add Zod for validation and keep services thin. Worth it to avoid framework overhead in a 6-hour project.

### 2. Prisma

**What:** Prisma ORM (not TypeORM).

**Why:** Prisma's schema-first approach (`schema.prisma` → generated client) produces type-safe queries with zero boilerplate. For a domain with clear relationships (User → Report → Item) and computed fields that need transactions, Prisma's transaction API is cleaner than TypeORM's decorator-based entities.

**Trade-off:** Prisma's query engine is a native binary — it requires OpenSSL on Alpine images and adds ~50MB to the Docker image. Acceptable for this scope.

### 3. React + Vite

**What:** React 18 with Vite (not Vue, not CRA/Webpack).

**Why:** React's JSX maps directly to the Stitch-exported HTML prototypes — copy-paste HTML into JSX, add state. Vue's template syntax adds a translation step. Vite needs zero config for React + TypeScript and starts instantly; CRA is deprecated, and Webpack configs are a time sink.

**Trade-off:** React's mental model (hooks, re-renders) is more complex than Vue's reactivity system for simple forms. Not a problem at this scale.

### 4. Tailwind CSS

**What:** Tailwind for styling (not CSS Modules, styled-components, or BEM).

**Why:** Eliminates naming/organization decisions for CSS. The Stitch design system's tonal palette maps directly to Tailwind custom colors. For a 6-hour exercise, not debating CSS methodology is a real time saving.

**Trade-off:** Utility classes can make JSX verbose. Acceptable trade-off for rapid prototyping.

---

## Domain & Business Logic

These decisions define how the expense report state machine works and what constitutes valid domain behavior.

### 5. REJECTED → DRAFT via Explicit Reopen Action

**What:** When an admin rejects a report, the user must click "Reopen to Draft" before editing. The transition is a deliberate `POST /api/reports/:id/reopen`, not an implicit flip on first edit.

**Why:** The spec diagram shows REJECTED → DRAFT as a distinct arrow, implying a deliberate action. An implicit flip (editing an item auto-transitions to DRAFT) risks accidental state changes — a user browsing a rejected report shouldn't silently change its status.

**Trade-off:** One extra endpoint and one extra UI button. Worth it for clarity and to prevent unintended state transitions.

### 6. Total Amount: Stored + Recomputed in Transaction

**What:** `ExpenseReport.totalAmount` is a stored database column, recomputed inside a Prisma transaction whenever an expense item is added, modified, or deleted.

**Why:** A stored column avoids N+1 queries when listing reports with amounts. The transaction ensures the total is always consistent with the sum of items. For this scale, recomputing on every change is negligible.

**Trade-off:** If items are ever modified outside the service layer (e.g., a raw SQL migration), the total could drift. Mitigated by keeping all item mutations inside the service.

### 7. Single Currency Display (No Conversion)

**What:** Items store a `currency` field (ISO 4217), but the report `totalAmount` is a single numeric sum without currency conversion. All items are assumed to be in the same currency.

**Why:** Multi-currency conversion requires an exchange rate service and adds significant complexity for little value in a demo. The `currency` field on items supports future expansion.

**Trade-off:** If a user adds items in different currencies, the total will be numerically meaningless. Acceptable for this scope.

### 8. Categories: Fixed Enum

**What:** Expense categories are a Prisma enum: `TRAVEL`, `MEALS`, `OFFICE_SUPPLIES`, `SOFTWARE`, `HARDWARE`, `MARKETING`, `OTHER`.

**Why:** A fixed set is simpler, enables filtering, and avoids a separate Categories table with its own CRUD. The `OTHER` option catches anything that doesn't fit.

**Trade-off:** Users cannot define custom categories. If the domain expands, the enum requires a migration.

### 9. Block Empty Report Submission

**What:** The `submit()` endpoint returns a `ValidationError` if the report has zero expense items.

**Why:** Submitting an empty expense report has no domain value — it would just create noise for admins to review. This validation lives in the service layer because it requires a database query to check item count.

**Trade-off:** Extra validation rule not explicitly in the spec. The rule is obvious in hindsight and prevents meaningless submissions.

### 10. Report Field Edits Allowed in REJECTED, Item Edits Require Reopen

**What:** Updating a report's `title` and `description` is allowed in both DRAFT and REJECTED status. Editing items (add/update/delete) is allowed in DRAFT and REJECTED per the backend state machine, but the frontend gate-keeps item edits behind the explicit "Reopen to Draft" action.

**Why:** The `canEditMetadata` guard returns true for REJECTED, letting users revise metadata before deciding to reopen. The `canEditItems` guard also returns true for REJECTED in the backend — the frontend adds an extra layer of UX safety by requiring the reopen step first.

**Trade-off:** There's a surface-level inconsistency: the backend allows item edits in REJECTED while the frontend restricts them to DRAFT. This is intentional — the backend validates domain rules (rejected items *can* be edited after reopen), while the frontend enforces a stricter UX flow (force the user to acknowledge the reopen action before touching items).

---

## API & Security

### 11. RBAC Middleware Built, Admin Route Wiring Deferred

**What:** The `requireRole()` middleware is implemented and ready, but no routes currently use it. Admin endpoints (`/api/admin/*`) are planned for Phase 5, and that's where the middleware will be wired.

**Why:** Building the RBAC infrastructure early ensures auth-protected endpoints are consistent when added. The gap is a phase dependency, not an oversight — the `requireRole('admin')` guard will be applied to all admin routes in Phase 5.

**Trade-off:** Until Phase 5, any authenticated user could theoretically access an admin route if one existed. Since no admin routes exist yet, there's no actual security gap.

### 12. Admin User via Seed Script

**What:** Admin users are created via `npm run prisma:seed`. There is no admin registration endpoint.

**Why:** In production, admin provisioning would be gated behind an invite/permissions system. For this exercise, a seed script is sufficient and avoids building an invite flow.

**Trade-off:** The seed creates a known admin email/password in the database. Acceptable for a demo; unacceptable for production.

### 13. Single JWT Token (No Refresh)

**What:** One JWT with a 7-day expiry, stored in localStorage. No refresh token rotation.

**Why:** Access + refresh token rotation adds a `/auth/refresh` endpoint, rotation logic, and frontend interceptor handling. For a take-home exercise where the only consumer is one browser tab, a long-lived token is acceptable. A real system would use httpOnly cookies with short-lived access tokens.

**Trade-off:** A compromised token is valid for 7 days. localStorage is vulnerable to XSS. Both are acceptable risks for a demo, not for production.

### 14. No Pagination on List Endpoints

**What:** List endpoints return all results. No `?page=` or `?limit=` parameters.

**Why:** This is a demo with seed data — there won't be thousands of records. Pagination adds backend query logic, frontend page controls, and testing surface that doesn't demonstrate architectural judgment.

**Trade-off:** Does not scale. The "one more day" section calls this out as the first infrastructure improvement.

### 15. Nested Item Routes with Defense-in-Depth

**What:** Item routes are mounted at `/api/reports/:reportId/items`. The service verifies each item belongs to the specified report (`WHERE id = ? AND reportId = ?`).

**Why:** Items have no independent existence — every item operation requires the parent report's context (ownership check, status validation, total recomputation). Nesting makes the relationship explicit. The extra `reportId` check is defense-in-depth: even if a client manipulates the URL to target an item on a different report, the database query will fail.

**Trade-off:** One extra `WHERE` clause per item mutation. Negligible cost for stronger security.

### 16. Receipt Storage: Local Filesystem

**What:** Receipt files are uploaded via multer and stored on the local filesystem in `backend/uploads/`. No cloud storage or MinIO.

**Why:** The spec explicitly allows local filesystem storage. Multer is the standard Express middleware for multipart/form-data. Files are served statically from the same backend server.

**Trade-off:** Local filesystem storage doesn't scale horizontally — if you run multiple backend instances, they won't share uploads. For a single-instance demo, this is fine. Production would use S3 or similar.

---

## Frontend

### 17. Stitch Mockups Are Visual Specs, Not Product Requirements

**What:** The Stitch design exports guide layout and styling, but some UI artifacts in the mockups are not implemented as real behavior. For example, the signup role selector is decorative — roles are not user-chosen during signup.

**Why:** The mockups are quick visual specs, not authoritative business logic. Admin access is seeded and controlled server-side, not selected by users. Implementation follows security rules over prototype details.

**Trade-off:** Minor visual differences from the mockups where business logic contradicts prototype artifacts.

### 18. Report Create as Page, Not Modal

**What:** Creating a report navigates to `/reports/new` instead of opening a modal over the report list.

**Why:** Modals add state management complexity (open/close, backdrop, focus trap) for marginal UX benefit. A page route is simpler, supports direct URL navigation, and works naturally with the browser back button. The form has only two fields — a modal's "in-context" feel isn't necessary.

**Trade-off:** One extra navigation away from the report list. Acceptable for such a simple form.

### 19. Stats Cards Derived Client-Side

**What:** The summary cards on the report list (Total Outstanding, Draft count, In Review count, Approved YTD) are computed from the fetched report list in the frontend, not from a dedicated API endpoint.

**Why:** The dataset is small (no pagination per decision 14), so computing sums and counts in JavaScript is negligible. Adding a backend aggregation endpoint would require a new route and service method for data that's already available client-side.

**Trade-off:** Won't scale if the dataset grows significantly. The fix is straightforward — add a `/api/reports/stats` endpoint and swap the client-side computation.

### 24. No Real-Time Updates — Manual Refresh Only

**What:** When an admin changes a report's status (approve/reject) or a user adds a new item, other views showing the same data do not update automatically. Users must manually navigate or refresh to see changes.

**Why:** AI-assisted development suggested several real-time approaches (polling, React Query with background refetch, SSE, WebSockets) to keep the UI in sync. Each adds meaningful complexity — new dependencies, connection lifecycle management, or backend event infrastructure — for marginal gain in a demo where a single user is testing workflows. Manual refresh is the simplest approach that works correctly today.

**Trade-off:** Stale data if a user and admin are both viewing the same report. Acceptable for a take-home exercise. A production system would add React Query with background refetch as a first step, then SSE or WebSockets if sub-second sync is required.

---

## Infrastructure

### 20. Monorepo Without Workspace Tooling

**What:** Backend and frontend are separate directories with their own `package.json`, managed independently. No Lerna, Nx, or Turborepo.

**Why:** For a 2-app project, workspace tooling adds configuration overhead with no real benefit. Docker Compose handles orchestration for local development.

**Trade-off:** No shared TypeScript types between backend and frontend — each mirrors its own version. Acceptable for this scope.

### 21. Docker Gotchas: Postgres Health Check + Alpine OpenSSL

**What:** Two infrastructure decisions that aren't obvious from the code:

1. The backend `depends_on` Postgres with `condition: service_healthy` using a `pg_isready` health check, not a bare `depends_on`. A bare `depends_on` only waits for the container process to start — not for Postgres to finish `initdb` and accept connections. Fresh volumes would cause `prisma migrate deploy` to fail with `P1001: Can't reach database server`.

2. The backend Dockerfile installs `openssl` via `apk add --no-cache openssl` before `npm ci`. Prisma's query engine links against `libssl`, which is absent from `node:20-alpine`, causing a crash at runtime.

**Trade-off:** The health check adds ~5s to startup on fresh volumes. The OpenSSL package adds ~2MB to the image. Both are negligible.

---

## AI Extraction

### 22. Synchronous Receipt Extraction

**What:** Receipt extraction runs synchronously during the upload request. The endpoint accepts the file, sends it to the LLM, and returns extracted fields in the response.

**Why:** For this scope, receipts are small files and LLM extraction typically completes in 2-5 seconds. A polling/async approach adds complexity (job queue, status polling, WebSocket) that isn't justified for the exercise. The frontend shows a loading spinner during upload.

**Trade-off:** The request blocks for the duration of the LLM call. If the LLM is slow or the file is large, the user waits. With more time, a job queue (Redis + BullMQ) would make this async with immediate upload response and polling for results.

### 23. Abstract Extraction Interface for Provider Swapping

**What:** The AI extraction service is abstracted behind an `IExtractionService` interface with a factory function (`getExtractionService()`). Two implementations exist: `OpenAIExtractionService` (real GPT-4o-mini calls) and `MockExtractionService` (returns static data). The factory selects based on `OPENAI_API_KEY`: real key → OpenAI, empty or `dummy` → Mock. An `OPENAI_BASE_URL` env var supports any OpenAI-compatible API endpoint without code changes.

**Why:** The assessment spec requires LLM-powered extraction, but the specific provider shouldn't be hardcoded. Three common scenarios need to work: (1) development without an API key, (2) OpenAI directly, (3) alternative providers like Anthropic via a proxy, Ollama locally, or OpenRouter. The `OPENAI_BASE_URL` approach handles scenarios 2 and 3 with zero code changes — the `openai` npm SDK supports custom base URLs natively. For providers with entirely different APIs (e.g., native Anthropic SDK), adding a new `IExtractionService` implementation is a single file that plugs into the factory.

**Trade-off:** The `IExtractionService` interface only has one production implementation today. The abstraction cost is minimal (one interface file + one factory file), but the `OPENAI_BASE_URL` env var means you must use an OpenAI-compatible endpoint. True Anthropic/Claude support would require a new implementation class — roughly 50 lines following the existing pattern. This is an acceptable trade-off: the 80% case (OpenAI or OpenAI-compatible providers) works with just an env var, and the remaining 20% (incompatible providers) has a clear extension point.

### 24. Extracted recomputeTotal for Testability

**What:** `recomputeTotal` was extracted from `item.service.ts` into `item.utils.ts`, following the same pattern as `findOwnedReport` in `report.utils.ts`.

**Why:** `recomputeTotal` was a private function inside `item.service.ts`, making it impossible to unit test in isolation without complex Prisma transaction mocking. Extracting it as an exported utility enables direct testing with a mock transaction object — the same approach used for `findOwnedReport`.

**Trade-off:** One extra file and import. The function could have been tested indirectly through the service with heavier mocking, but that would test the mocks more than the logic. Direct testing is clearer and more maintainable.

---

## If I Had One More Day

I would prioritize in this order, based on the ratio of user value to implementation effort:

**1. Real-time data synchronization.** Replace `useState`+`useEffect` fetching with React Query (TanStack Query) to get stale-while-revalidate semantics, automatic background refetching, and cache invalidation. This is the highest-impact UX improvement — currently, an admin approving a report doesn't reflect on the user's screen until they manually refresh. React Query would handle this with `refetchOnWindowFocus` and configurable `refetchInterval`, no backend changes required. If sub-second sync is needed, add a lightweight SSE endpoint (`GET /api/events`) that broadcasts change events to trigger targeted refetches.

**2. Background job queue for receipt processing.** This is the highest-value architectural improvement. Currently, receipt extraction blocks the HTTP request — if the LLM is slow or the file is large, the user stares at a spinner. With a job queue (Redis + BullMQ or PgBoss), uploads return immediately, the frontend polls for results, and failures can be retried gracefully. This also unlocks batch receipt uploads — a real user need when expense reports contain 10-20 receipts. The queue would add a `/api/receipts/:id/status` polling endpoint and a background worker process in Docker Compose.

**2. Audit trail for status transitions.** A `StatusHistory` table recording `who`, `from_status`, `to_status`, `timestamp`, and an optional `reason` comment. This is the most important missing feature from a business perspective — real expense systems live and die by their audit records. Compliance teams need an immutable timeline, and approvers need to see what happened before they act. It would be surfaced in the admin report detail view as a timeline component. The schema is straightforward; the challenge is making it visible and useful rather than just stored.

**3. Pagination and sorting on all list endpoints.** Currently lists return everything. For a real system with thousands of reports from many users, cursor-based pagination and sortable columns are essential. The backend change is straightforward (Prisma `cursor` + `take`), but the frontend needs careful UX — infinite scroll vs. page controls, filter + sort combinations, and loading states that feel responsive rather than janky.

**4. Confidence scores on AI extraction.** Display per-field confidence from the LLM response so users can see which extracted values are uncertain. This builds trust in the AI feature — users are more likely to accept suggestions when they can see the model's certainty level. Implementation requires modifying the LLM prompt to request confidence scores and adding a visual indicator (color-coded borders, percentage badges) on each form field.

**5. Structured logging with request correlation IDs.** The current error handling is adequate for development but wouldn't survive production. Replacing `console.log` with Pino (structured JSON logs, request IDs, log levels) makes debugging user-reported issues tractable. Correlation IDs that flow from the frontend request header through to the database query would tie scattered log lines into a coherent request trace.