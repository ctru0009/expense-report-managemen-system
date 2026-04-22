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

### 11. RBAC Middleware with Role-Typed Enforcement

**What:** The `requireRole()` middleware accepts Prisma's `Role` enum (`'USER' | 'ADMIN'`), not arbitrary strings. All admin routes use `requireRole('ADMIN')`. Unauthenticated requests hit the middleware return a 401 (not 403), because the semantic distinction matters: 401 = "you are not logged in", 403 = "you are logged in but lack permission."

**Why:** Using `Role` enum types in `requireRole()` prevents silent mismatches from typos (e.g., `requireRole('admin')` lowercase would be a compile error since `Role` only accepts `'USER' | 'ADMIN'`). The 401/403 distinction follows HTTP semantics and helps clients decide whether to re-authenticate vs. give up.

**Trade-off:** The middleware depends on Prisma's generated `Role` type. If roles change in the schema, the middleware type updates automatically, but the route call sites must also update. This is acceptable — role changes are rare and a compile error is preferable to a silent runtime failure.

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

### 17. Transaction-Wrapped Admin Approve/Reject

**What:** The `approveReport()` and `rejectReport()` service functions read the report status and update it inside a single `prisma.$transaction` (interactive transaction), not as separate read-then-write operations.

**Why:** A read-then-write pattern has a TOCTOU (time-of-check-time-of-use) race condition: two concurrent admin requests (approve + reject) could both read `SUBMITTED`, both pass the state machine validation, and whichever update runs second would silently overwrite the first. Wrapping in a transaction ensures the read and write happen atomically — the second transaction would see the already-updated status and fail the state machine check.

**Trade-off:** Interactive transactions hold a database connection for the duration of the read+compute+write cycle. For approval/rejection (which are infrequent, fast operations), this is negligible. A more aggressive approach would use database-level `SELECT ... FOR UPDATE` row locks, but Prisma's interactive transactions provide sufficient isolation for this scale.

### 18. Zod UUID Param Validation as Defense-in-Depth

**What:** All admin route `:id` parameters are validated against `z.string().uuid()` before reaching the service layer. Invalid UUIDs return 400 `VALIDATION_ERROR` instead of leaking as Prisma internal errors (500).

**Why:** Without param validation, a non-UUID string like `/api/admin/reports/not-a-uuid` causes Prisma to throw a `PrismaClientValidationError`, which isn't caught by the error handler's `PrismaClientKnownRequestError` mapping. The result is a generic 500 `INTERNAL_ERROR` response — misleading for the client and noisy in logs. Validating at the route layer returns a proper 400 before the query ever executes.

**Trade-off:** One extra Zod schema per route with `:id` params (currently only admin routes). The same pattern applies to report and item routes, but those already rely on Prisma's `findUnique` returning `null` (→ `NotFoundError` 404) because they use UUID primary keys — non-UUID inputs naturally fail the lookup. Admin routes are singled out because the error handler's gap is most visible there. A global `validateParamId` middleware for all `:id` routes would be more consistent but adds cross-cutting configuration for marginal benefit.

---

## Frontend

### 19. Stitch Mockups Are Visual Specs, Not Product Requirements

**What:** The Stitch design exports guide layout and styling, but some UI artifacts in the mockups are not implemented as real behavior. For example, the signup role selector is decorative — roles are not user-chosen during signup.

**Why:** The mockups are quick visual specs, not authoritative business logic. Admin access is seeded and controlled server-side, not selected by users. Implementation follows security rules over prototype details.

**Trade-off:** Minor visual differences from the mockups where business logic contradicts prototype artifacts.

### 20. Report Create as Page, Not Modal

**What:** Creating a report navigates to `/reports/new` instead of opening a modal over the report list.

**Why:** Modals add state management complexity (open/close, backdrop, focus trap) for marginal UX benefit. A page route is simpler, supports direct URL navigation, and works naturally with the browser back button. The form has only two fields — a modal's "in-context" feel isn't necessary.

**Trade-off:** One extra navigation away from the report list. Acceptable for such a simple form.

### 21. Stats Cards Derived Client-Side

**What:** The summary cards on the report list (Total Outstanding, Draft count, In Review count, Approved YTD) are computed from the fetched report list in the frontend, not from a dedicated API endpoint.

**Why:** The dataset is small (no pagination per decision 14), so computing sums and counts in JavaScript is negligible. Adding a backend aggregation endpoint would require a new route and service method for data that's already available client-side.

**Trade-off:** Won't scale if the dataset grows significantly. The fix is straightforward — add a `/api/reports/stats` endpoint and swap the client-side computation.

### 22. Audit Completion Counts Rejection as Reviewed

**What:** The admin dashboard "Audit Completion %" is calculated as `(approvedCount + rejectedCount) / (submittedCount + approvedCount + rejectedCount)`. Both approved and rejected reports count as "reviewed" in the numerator; only submitted (pending) reports count as unreviewed.

**Why:** An admin who rejects a report has performed a review — the report was evaluated and a decision was made. Counting only approvals as "reviewed" penalized the audit completion metric when reports were rejected, which is nonsensical: a rejection *is* an audit action, not a failure to act.

**Trade-off:** The metric conflates "quality of review" with "completion of review." A high audit completion % could mask a scenario where admins are blindly rejecting everything. A future improvement would separate "review rate" (reviewed / total actionable) from "approval rate" (approved / reviewed).

### 23. No Real-Time Updates — Manual Refresh Only

**What:** When an admin changes a report's status (approve/reject) or a user adds a new item, other views showing the same data do not update automatically. Users must manually navigate or refresh to see changes.

**Why:** AI-assisted development suggested several real-time approaches (polling, React Query with background refetch, SSE, WebSockets) to keep the UI in sync. Each adds meaningful complexity — new dependencies, connection lifecycle management, or backend event infrastructure — for marginal gain in a demo where a single user is testing workflows. Manual refresh is the simplest approach that works correctly today.

**Trade-off:** Stale data if a user and admin are both viewing the same report. Acceptable for a take-home exercise. A production system would add React Query with background refetch as a first step, then SSE or WebSockets if sub-second sync is required.

---

## Infrastructure

### 24. Monorepo Without Workspace Tooling

**What:** Backend and frontend are separate directories with their own `package.json`, managed independently. No Lerna, Nx, or Turborepo.

**Why:** For a 2-app project, workspace tooling adds configuration overhead with no real benefit. Docker Compose handles orchestration for local development.

**Trade-off:** No shared TypeScript types between backend and frontend — each mirrors its own version. Acceptable for this scope.

### 25. Docker Gotchas: Postgres Health Check + Alpine OpenSSL

**What:** Two infrastructure decisions that aren't obvious from the code:

1. The backend `depends_on` Postgres with `condition: service_healthy` using a `pg_isready` health check, not a bare `depends_on`. A bare `depends_on` only waits for the container process to start — not for Postgres to finish `initdb` and accept connections. Fresh volumes would cause `prisma migrate deploy` to fail with `P1001: Can't reach database server`.

2. The backend Dockerfile installs `openssl` via `apk add --no-cache openssl` before `npm ci`. Prisma's query engine links against `libssl`, which is absent from `node:20-alpine`, causing a crash at runtime.

**Trade-off:** The health check adds ~5s to startup on fresh volumes. The OpenSSL package adds ~2MB to the image. Both are negligible.

---

## AI Extraction

### 26. Synchronous Receipt Extraction

**What:** Receipt extraction runs synchronously during the upload request. The endpoint accepts the file, sends it to the LLM, and returns extracted fields in the response.

**Why:** For this scope, receipts are small files and LLM extraction typically completes in 2-5 seconds. A polling/async approach adds complexity (job queue, status polling, WebSocket) that isn't justified for the exercise. The frontend shows a loading spinner during upload.

**Trade-off:** The request blocks for the duration of the LLM call. If the LLM is slow or the file is large, the user waits. With more time, a job queue (Redis + BullMQ) would make this async with immediate upload response and polling for results.

### 27. Abstract Extraction Interface for Provider Swapping

**What:** The AI extraction service is abstracted behind an `IExtractionService` interface with a factory function (`getExtractionService()`). Two implementations exist: `OpenAIExtractionService` (real LLM calls via OpenAI-compatible SDK) and `MockExtractionService` (returns static data). The factory selects based on `LLM_API_KEY`: real key → OpenAI-compatible service, empty or `dummy` → Mock. The model and base URL are configurable via `LLM_MODEL` and `LLM_BASE_URL` env vars. The default configuration routes through OpenRouter to Google Gemini (`google/gemini-2.5-flash-lite`), not OpenAI directly.

**Why:** The assessment spec requires LLM-powered extraction, but the specific provider shouldn't be hardcoded. Three common scenarios need to work: (1) development without an API key, (2) OpenAI directly, (3) alternative providers via OpenRouter (Gemini, Claude, etc.) or locally via Ollama. The `openai` npm SDK supports custom base URLs natively, so any OpenAI-compatible endpoint works with zero code changes by setting `LLM_BASE_URL`. For providers with entirely different APIs (e.g., native Google AI SDK), adding a new `IExtractionService` implementation is a single file that plugs into the factory.

**Trade-off:** The `IExtractionService` interface only has one production implementation today. The abstraction cost is minimal (one interface file + one factory file), but the `LLM_BASE_URL` env var means you must use an OpenAI-compatible endpoint. True native Gemini/Anthropic SDK support would require a new implementation class — roughly 50 lines following the existing pattern. This is an acceptable trade-off: the 80% case (OpenAI or OpenAI-compatible providers like OpenRouter) works with just env vars, and the remaining 20% (incompatible native SDKs) has a clear extension point.

### 27b. Gemini via OpenRouter (Not Native SDK)

**What:** The default LLM provider is Google Gemini (`google/gemini-2.5-flash-lite`) accessed through OpenRouter (`https://openrouter.ai/api/v1`), not via the `@google/generative-ai` SDK. The `openai` npm SDK is used as the client, pointing at the OpenRouter endpoint. Env vars use the `LLM_*` prefix (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`) which fall back to `OPENAI_*` for backward compatibility.

**Why:** Adding the `@google/generative-ai` SDK as a dependency would require a new `GeminiExtractionService` class, new factory branching logic, and a new env var (`LLM_PROVIDER`) to select which service to instantiate. OpenRouter exposes an OpenAI-compatible API, so the existing `OpenAIExtractionService` works with zero code changes — just set `LLM_BASE_URL` and `LLM_MODEL`. This also unlocks access to any model on OpenRouter (Claude, Llama, Mistral, etc.) with a single env var swap.

**Trade-off:** Depends on OpenRouter as a proxy — one extra network hop and an external dependency. If OpenRouter is down, extraction fails (the retry logic handles transient failures). A native Gemini SDK would eliminate the proxy and might offer Gemini-specific features (e.g., Google Search grounding), but adds significant code complexity for a single-provider integration. The OpenRouter approach is the "80/20" solution: 80% of the benefit (working Gemini extraction) with 20% of the code cost (zero new code). The factory pattern means adding a native SDK later is still straightforward.

### 27c. Docker env_file Instead of Hardcoded environment Block

**What:** The backend Docker service uses `env_file: ./backend/.env` to inject environment variables, with only Docker-specific overrides (`DATABASE_URL`, `UPLOAD_DIR`) in the `environment:` block. All other config (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `JWT_SECRET`, etc.) comes from `backend/.env`.

**Why:** Previously, the `docker-compose.yml` hardcoded `OPENAI_API_KEY: ${OPENAI_API_KEY:-sk-dummy}`, which resolved from the *host shell environment* — not from `backend/.env`. This meant `LLM_API_KEY` set in `.env` was invisible inside the container, causing the factory to select `MockExtractionService` and return sample data instead of real AI extraction. Using `env_file` directly reads `backend/.env` into the container, making the `.env` file the single source of truth for backend config. Docker-specific overrides (like `DATABASE_URL` with the Docker-internal `postgres` hostname) take precedence via `environment:` since `environment` overrides `env_file`.

**Trade-off:** `env_file` is read at container start, not live — changing `.env` requires `docker-compose up` again (same as before). The `DATABASE_URL` in `backend/.env` uses the Docker-internal `postgres` hostname, so running the backend locally with `npm run dev` requires a different `DATABASE_URL` (e.g., `localhost:5432`). This is acceptable because the primary deployment is Docker, and local development can override via a separate `.env.local` or direct env var.

### 28. ~~Deferred Receipt Upload for New Items~~ *(Superseded by Decision 30/33)*

**What:** ~~When creating a new expense item, the receipt file is saved in local state (`pendingFile`) and uploaded *after* the item is saved to the database.~~ This approach was replaced by the Decoupled Extract-then-Confirm pattern (Decision 30) and Draft Item flow (Decision 33), which create the item immediately on receipt drop, enabling real-time AI pre-fill for both new and existing items.

**Why:** The original design deferred upload to avoid creating items without user confirmation. This was too conservative — the UX cost (no AI pre-fill for new items, the primary use case) outweighed the data purity benefit. The new approach creates a draft item immediately, runs upload+extract, and deletes the draft if the user cancels.

**Trade-off (original):** New items didn't get AI pre-fill from receipts. **Trade-off (new):** Draft items briefly exist as DB records with placeholder data. See Decision 33 for full analysis.

### 29. Extracted recomputeTotal for Testability

**What:** `recomputeTotal` was extracted from `item.service.ts` into `item.utils.ts`, following the same pattern as `findOwnedReport` in `report.utils.ts`.

**Why:** `recomputeTotal` was a private function inside `item.service.ts`, making it impossible to unit test in isolation without complex Prisma transaction mocking. Extracting it as an exported utility enables direct testing with a mock transaction object — the same approach used for `findOwnedReport`.

**Trade-off:** One extra file and import. The function could have been tested indirectly through the service with heavier mocking, but that would test the mocks more than the logic. Direct testing is clearer and more maintainable.

---

## If I Had One More Day

I would prioritize in this order, based on the ratio of user value to implementation effort:

**1. Real-time data synchronization.** Replace `useState`+`useEffect` fetching with React Query (TanStack Query) to get stale-while-revalidate semantics, automatic background refetching, and cache invalidation. This is the highest-impact UX improvement — currently, an admin approving a report doesn't reflect on the user's screen until they manually refresh. React Query would handle this with `refetchOnWindowFocus` and configurable `refetchInterval`, no backend changes required. If sub-second sync is needed, add a lightweight SSE endpoint (`GET /api/events`) that broadcasts change events to trigger targeted refetches.

**2. Background job queue for receipt processing.** This is the highest-value architectural improvement. Currently, receipt extraction blocks the HTTP request — if the LLM is slow or the file is large, the user stares at a spinner. With a job queue (Redis + BullMQ or PgBoss), uploads return immediately, the frontend polls for results, and failures can be retried gracefully. This also unlocks batch receipt uploads — a real user need when expense reports contain 10-20 receipts. The queue would add a `/api/receipts/:id/status` polling endpoint and a background worker process in Docker Compose.

**3. Audit trail for status transitions.** A `StatusHistory` table recording `who`, `from_status`, `to_status`, `timestamp`, and an optional `reason` comment. This is the most important missing feature from a business perspective — real expense systems live and die by their audit records. Compliance teams need an immutable timeline, and approvers need to see what happened before they act. It would be surfaced in the admin report detail view as a timeline component. The schema is straightforward; the challenge is making it visible and useful rather than just stored.

**4. Pagination and sorting on all list endpoints.** Currently lists return everything. For a real system with thousands of reports from many users, cursor-based pagination and sortable columns are essential. The backend change is straightforward (Prisma `cursor` + `take`), but the frontend needs careful UX — infinite scroll vs. page controls, filter + sort combinations, and loading states that feel responsive rather than janky.

**5. Confidence scores on AI extraction.** Display per-field confidence from the LLM response so users can see which extracted values are uncertain. This builds trust in the AI feature — users are more likely to accept suggestions when they can see the model's certainty level. Implementation requires modifying the LLM prompt to request confidence scores and adding a visual indicator (color-coded borders, percentage badges) on each form field.

**6. Structured logging with request correlation IDs.** The current error handling is adequate for development but wouldn't survive production. Replacing `console.log` with Pino (structured JSON logs, request IDs, log levels) makes debugging user-reported issues tractable. Correlation IDs that flow from the frontend request header through to the database query would tie scattered log lines into a coherent request trace.

---

## AI Extraction v2 — Decoupled Extract-then-Confirm

These decisions document the redesign of the AI extraction feature from a coupled upload-and-extract pattern to a decoupled three-phase pattern (upload → extract → apply). This redesign addresses three critical flaws in the original implementation: (1) new items never received AI pre-fill because extraction was deferred until after save, (2) extracted values silently overwrote user-typed data, and (3) re-extraction required deleting and re-uploading the same receipt.

### 30. Decoupled Upload / Extract / Apply Pattern

**What:** Receipt processing is split into three distinct operations: `POST /receipt` (saves file, sets `receiptUrl` — no extraction, no field mutation), `POST /receipt/extract` (read-only AI call, returns suggestions with confidence scores — no DB writes), and `POST /receipt/apply` (user explicitly accepts selected fields, which are then persisted to the item and total is recomputed). This replaces the previous atomic endpoint that combined all three into a single request.

**Why:** The original design coupled three concerns that should be independent:

1. **New-item pre-fill gap.** Creating an item deferred receipt upload until after save (`pendingFile` in React state), so AI extraction ran server-side *after* the modal closed. The user never saw extracted data populate the form — the core value of AI extraction (reducing manual data entry) was lost for the primary creation use case. With the decoupled pattern, the item is created immediately on receipt drop (as a draft with placeholder data), so upload + extract can run right away and populate the form in real-time.

2. **Destructive pre-fill.** The old endpoint merged extracted fields directly into the item's DB row and returned the updated item. If the user had partially filled the form, extracted values silently overwrote their input. With the decoupled pattern, `extract` is read-only — it returns suggestions without persisting anything. The `apply` endpoint only writes fields the user explicitly accepts.

3. **No re-extraction.** If extraction returned bad data, the only path was to delete the receipt and re-upload the same file. With the decoupled pattern, `POST /receipt/extract` is stateless and idempotent — call it as many times as needed. The frontend adds a "Re-extract" button visible after successful extraction.

**Trade-off:** Three API calls instead of one (and two for new items, since create + upload are chained sequentially). This adds latency on the critical path but makes each operation simpler, independently testable, and retryable. Two alternatives were considered and rejected:

- **Streaming extraction (SSE):** Arguably a better UX for real-time progressive field population, but the infrastructure complexity (SSE connection management, load balancer timeouts, proxy compatibility, connection cleanup) is disproportionate for a single-receipt-at-a-time flow. The decoupled pattern achieves 90% of the UX gain (immediate pre-fill, per-field control, retry) with 20% of the implementation complexity. SSE could be added later by converting the `extract` endpoint without changing `upload` or `apply`.

- **Background extraction (job queue):** The fastest perceived experience (upload returns instantly, extraction happens async), but it introduces a job queue (Redis + BullMQ or PgBoss), polling endpoints, and a worker process in Docker Compose. For a single receipt upload that completes in 2-5 seconds, the overhead isn't justified. This is the right pattern if the application scales to batch receipt uploads (10-20 receipts per report), which is a real user need but out of scope.

### 31. Confidence-Based Auto-Accept Threshold

**What:** Extracted fields with confidence ≥ 0.8 are auto-populated into form fields with a yellow `ai-highlight` class. Fields below 0.8 are shown as inline suggestion chips (amber `ai-highlight-low` on the input, or a `suggestion-chip-low` below it) that the user must explicitly accept via an "Accept" button. All highlights clear when the user edits the field.

**Why:** Blindly auto-filling every extracted field (as the previous implementation did) risks polluting the form with low-quality data — the user must then inspect and clean every field anyway, which defeats the purpose. A confidence threshold lets the system auto-fill what it's sure about (reducing manual entry for the high-confidence case) while surfacing uncertain data for explicit review. The 0.8 threshold is empirically reasonable for `gpt-4o-mini` with receipt images; it can be tuned without code changes by making it an env var (`EXTRACTION_AUTO_ACCEPT_THRESHOLD`).

**Trade-off:** The threshold is a heuristic, not a guarantee. A field with 0.85 confidence could still be wrong. The user still needs to review all highlighted fields — the threshold just reduces the number of clicks required for high-confidence extractions. An alternative was requiring explicit accept for *every* field regardless of confidence, but that adds 4-5 clicks for usually-correct data, which degrades the UX for the 90%+ case where extraction is accurate. The current design optimizes for the common case (accurate extraction → zero extra clicks) while safeguarding the uncommon case (uncertain extraction → explicit accept required).

### 32. Category Extraction via LLM

**What:** The LLM prompt now includes category inference (`TRAVEL`, `MEALS`, `OFFICE_SUPPLIES`, `SOFTWARE`, `HARDWARE`, `MARKETING`, `OTHER`) alongside the existing merchant/amount/currency/date fields. Category values are validated against the Prisma enum on the backend — invalid values default to `OTHER`.

**Why:** The original Stitch design mockup shows the `category` field highlighted with `ai-highlight`, indicating the designer expected AI to fill it. Withholding category from extraction creates a friction point — the user must always select it manually even when the merchant name ("Marriott", "Starbucks") makes the category obvious. The LLM can infer category from merchant context with reasonable accuracy, and the confidence score signals when it's uncertain (which is often, since receipts don't explicitly state "this is a travel expense").

**Trade-off:** Category extraction is inherently lower-confidence than merchant name or amount (the receipt rarely states its own category). Confidence scores will typically be 0.5-0.7, meaning category suggestions will usually appear as "Accept" chips rather than auto-populated fields. This is the correct behavior — it surfaces the LLM's best guess without forcing it on the user. An invalid category string from the LLM is caught server-side and defaults to `OTHER`, so no bad data can leak through. The alternative of not extracting category at all is simpler but ignores the clear design intent and leaves a manual step that AI can reasonably assist with.

### 33. Draft Item for New-Item Receipt Flow

**What:** When a user drops a receipt while creating a new expense item, the frontend immediately creates a "draft" item via `POST /api/reports/:reportId/items` with placeholder values (`merchantName: "New Expense"`, `amount: 0.01`, `category: OTHER`), gets back a real item ID, then chains upload → extract → review. If the user cancels (Discard), the draft item is deleted via `DELETE /api/reports/:reportId/items/:draftItemId`. If they save, the draft is updated in-place with the final form values.

**Why:** The previous approach stored the file as `pendingFile` in React state and uploaded it after the item was saved. This meant AI extraction only ran after the form was submitted and the modal was closed — the user never experienced the core feature value (automatic field population from a receipt). Creating the item first (even with placeholder data) unlocks the full upload → extract → review flow for new items, matching the edit-item experience. This also simplifies the frontend state — there's no `pendingFile` variable, no deferred upload logic, and no split code path between new/edit items.

**Trade-off:** Draft items are real database records that momentarily exist with placeholder data. If the user cancels, the draft is deleted, but there's a brief window where a `loadReport()` call could show a phantom item. This is mitigated by: (1) the draft has a distinctive `merchantName` ("New Expense") that makes it obviously a work-in-progress, (2) the delete happens synchronously before `onSaved` triggers a refresh, and (3) the phantom-item window is a cosmetic issue, not a data integrity issue — the report total is always recomputed on the next item mutation. The alternative (a separate `Receipt` table with its own lifecycle, decoupled from items) adds significantly more complexity (a new model, new routes, receipt-to-item linking logic) for a marginal improvement in avoiding the phantom-item window.