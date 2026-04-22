# DECISIONS.md

Each entry: **What**, **Why**, **Trade-off**. Grouped by domain.

---

## Stack Choices

Stack chosen for speed — minimal configuration, productive tooling.

### 1. Node.js + Express

**What:** Node.js backend with Express (not Fastify or NestJS).

**Why:** One language across the stack reduces context-switching. Express with a clean folder structure achieves separation of concerns without NestJS's DI ceremony. Fastify's benchmark advantage is irrelevant at this scale.

**Trade-off:** No built-in schema validation or DI — Zod fills the gap. Worth it to avoid framework overhead in a 6-hour project.

### 2. Prisma

**What:** Prisma ORM (not TypeORM).

**Why:** Schema-first approach produces type-safe queries with zero boilerplate. Transaction API is cleaner than TypeORM's decorator entities for a domain with computed fields.

**Trade-off:** Query engine is a native binary — requires OpenSSL on Alpine and adds ~50MB to the Docker image. Acceptable for this scope.

### 3. React + Vite

**What:** React 18 with Vite (not Vue, not CRA/Webpack).

**Why:** JSX maps directly to Stitch HTML prototypes — copy-paste, add state. Vue's templates add a translation step. Vite needs zero config and starts instantly; CRA is deprecated.

**Trade-off:** React's hooks/re-render mental model is more complex than Vue's reactivity for simple forms. Not a problem at this scale.

### 4. Tailwind CSS

**What:** Tailwind for styling (not CSS Modules, styled-components, or BEM).

**Why:** Eliminates naming/organization decisions. Stitch's tonal palette maps directly to Tailwind custom colors.

**Trade-off:** Utility classes make JSX verbose. Acceptable trade-off for rapid prototyping.

---

## Domain & Business Logic

### 5. REJECTED → DRAFT: Explicit Reopen for Items, Free Metadata Edits

**What:** When an admin rejects a report, the user must explicitly reopen to DRAFT (`POST /api/reports/:id/reopen`) before editing items. Title and description edits remain allowed in REJECTED without reopening.

**Why:** The spec diagram shows REJECTED → DRAFT as a distinct arrow, implying deliberate action. Item mutations change financial data and affect `totalAmount`, requiring an explicit confirmation gate. Metadata edits are non-financial and safe without a state transition — revising a rejected report's title shouldn't trigger a status change.

**Trade-off:** One extra click before editing items on a rejected report. Intentional — reopen is a confirmation gate before modifying financial data.

### 6. Total Amount: Stored + Recomputed in Transaction

**What:** `totalAmount` is a stored column, recomputed inside a Prisma transaction on every item add/update/delete.

**Why:** Stored column avoids N+1 queries when listing. Transaction ensures total always equals sum of items.

**Trade-off:** Items modified outside the service layer (e.g., raw SQL migration) could drift the total. Mitigated by keeping all item mutations inside the service.

### 7. Single Currency Display (No Conversion)

**What:** Items store a `currency` field (ISO 4217), but `totalAmount` sums without conversion. All items assumed same currency.

**Why:** Multi-currency conversion requires an exchange rate service and adds significant complexity for little demo value.

**Trade-off:** Items in different currencies produce a meaningless total. Acceptable for this scope.

### 8. Categories: Fixed Enum

**What:** Expense categories are a Prisma enum: `TRAVEL`, `MEALS`, `OFFICE_SUPPLIES`, `SOFTWARE`, `HARDWARE`, `MARKETING`, `OTHER`.

**Why:** Fixed set is simpler, enables filtering, and avoids a separate Categories table with its own CRUD.

**Trade-off:** Users cannot define custom categories. Domain expansion requires a migration.

### 9. Block Empty Report Submission

**What:** `submit()` returns `ValidationError` if the report has zero items.

**Why:** Submitting an empty report has no domain value — it creates noise for admins to review.

**Trade-off:** The spec implicitly allows empty submissions; this blocks them without explicit spec authorization.

---

## API & Security

### 10. RBAC Middleware with Role-Typed Enforcement

**What:** `requireRole()` accepts Prisma's `Role` enum (`'USER' | 'ADMIN'`), not arbitrary strings. Unauthenticated requests return 401, not 403.

**Why:** Enum types prevent silent mismatches from typos — wrong casing is a compile error. 401/403 distinction helps clients decide whether to re-authenticate vs. give up.

**Trade-off:** Middleware depends on Prisma's generated Role type. Schema changes require updating call sites, but compile errors are preferable to silent runtime failures.

### 11. Admin User via Seed Script

**What:** Admin users created via `npm run prisma:seed`. No admin registration endpoint.

**Why:** Admin provisioning would need an invite/permissions system in production. A seed script is sufficient for the exercise.

**Trade-off:** Known admin email/password in the database. Acceptable for a demo; not for production.

### 12. Single JWT Token (No Refresh)

**What:** One JWT with 7-day expiry in localStorage. No refresh token rotation.

**Why:** Token rotation adds a refresh endpoint, rotation logic, and frontend interceptors. For a single-browser-tab demo, a long-lived token is sufficient.

**Trade-off:** Compromised token valid for 7 days; localStorage vulnerable to XSS. Acceptable for a demo.

### 13. No Pagination on List Endpoints

**What:** List endpoints return all results. No `?page=` or `?limit=`.

**Why:** Demo with seed data — no thousands of records. Pagination adds query logic, page controls, and testing surface that doesn't demonstrate architectural judgment.

**Trade-off:** Does not scale. Called out as the first improvement in "One More Day."

### 14. Nested Item Routes with Defense-in-Depth

**What:** Item routes at `/api/reports/:reportId/items`. Service verifies each item belongs to the specified report (`WHERE id = ? AND reportId = ?`).

**Why:** The extra `reportId` check is defense-in-depth against URL manipulation targeting an item on a different report.

**Trade-off:** One extra WHERE clause per item mutation. Negligible cost.

### 15. Receipt Storage: Local Filesystem

**What:** Receipts stored on local filesystem in `backend/uploads/`. No cloud storage.

**Why:** Spec explicitly allows local filesystem. Sufficient for single-instance deployment.

**Trade-off:** Won't scale horizontally — multiple instances won't share uploads. Production would use S3.

### 16. Transaction-Wrapped Admin Approve/Reject

**What:** `approveReport()` and `rejectReport()` run read+write inside a single `prisma.$transaction`.

**Why:** Read-then-write has a TOCTOU race — concurrent approve+reject could both read SUBMITTED and the second silently overwrites. Transaction makes it atomic.

**Trade-off:** Interactive transactions hold a DB connection for the read+compute+write cycle. Negligible for infrequent approval operations.

### 17. Zod UUID Param Validation as Defense-in-Depth

**What:** Admin route `:id` params validated as UUID before reaching the service layer. Invalid UUIDs return 400, not 500.

**Why:** Non-UUID input causes Prisma to throw an unhandled internal error (500) instead of a proper validation error. Route-layer validation returns 400 before the query executes.

**Trade-off:** One extra Zod schema per `:id` route on admin endpoints. Report/item routes don't need this — Prisma's findUnique returns null for non-UUID inputs, producing a clean 404.

---

## Frontend

### 18. Stitch Mockups Are Visual Specs, Not Product Requirements

**What:** Stitch exports guide layout and styling, but some mockup artifacts are not real behavior (e.g., signup role selector is decorative — roles aren't user-chosen).

**Why:** Mockups are visual specs, not business logic. Admin access is seeded server-side. Security rules override prototype artifacts.

**Trade-off:** Minor visual differences where business logic contradicts prototype details.

### 19. Report Create as Page, Not Modal

**What:** Creating a report navigates to `/reports/new` instead of a modal.

**Why:** Modals add state management complexity (open/close, backdrop, focus trap) for marginal UX benefit. A page route supports direct URL navigation and the browser back button.

**Trade-off:** One extra navigation away from the list. Acceptable for a two-field form.

### 20. Stats Cards Derived Client-Side

**What:** Summary cards (Total Outstanding, Draft count, In Review count, Approved YTD) computed from the fetched report list in JS, not from a dedicated endpoint.

**Why:** Dataset is small (no pagination per decision 13). Client-side computation is negligible vs. adding a backend aggregation endpoint.

**Trade-off:** Won't scale with significant dataset growth. Fix: add a `/api/reports/stats` endpoint.

### 21. Audit Completion Counts Rejection as Reviewed

**What:** Admin dashboard "Audit Completion %" = `(approved + rejected) / (submitted + approved + rejected)`. Both approved and rejected count as reviewed.

**Why:** Rejecting a report is an audit action — the report was evaluated and a decision was made. Counting only approvals as "reviewed" is nonsensical: rejection is a decision, not a failure to act.

**Trade-off:** Metric conflates review completion with review quality. High completion could mask blind rejection. A future fix would separate review rate from approval rate.

### 22. No Real-Time Updates — Manual Refresh Only

**What:** Status changes don't auto-update other views. Manual refresh required.

**Why:** AI-assisted development suggested polling, React Query, SSE, and WebSockets. All add dependency/lifecycle complexity for a single-user demo where manual refresh is the correct approach — real-time infrastructure should only exist when real-time requirements exist.

**Trade-off:** Stale data if user and admin view the same report simultaneously. Production would add React Query with background refetch, then SSE for sub-second sync.

---

## Infrastructure

### 23. Monorepo Without Workspace Tooling

**What:** Backend and frontend are separate directories with own `package.json`. No Lerna, Nx, or Turborepo.

**Why:** For a 2-app project, workspace tooling adds configuration overhead with no real benefit. Docker Compose handles orchestration.

**Trade-off:** No shared TypeScript types between backend and frontend. Acceptable for this scope.

### 24. Docker Gotchas: Health Check, Alpine OpenSSL, env_file

**What:** Three non-obvious Docker decisions: (1) `service_healthy` with `pg_isready` — bare `depends_on` causes migrate failures on fresh volumes. (2) Dockerfile installs `openssl` — Prisma links `libssl`, absent from Alpine. (3) `env_file` instead of hardcoded `environment:` block — `environment:` reads from host shell, not `.env`, so `LLM_API_KEY` in `.env` was invisible inside the container, causing Mock selection instead of real extraction.

**Trade-off:** Health check adds ~5s startup; OpenSSL adds ~2MB; `env_file` requires `docker-compose up` on `.env` changes. `DATABASE_URL` in `.env` uses Docker-internal hostname, so local dev needs a different value.

---

## AI Extraction

### 25. Synchronous Receipt Extraction

**What:** Receipt extraction runs synchronously during the upload request. Response includes extracted fields.

**Why:** Receipts are small, LLM extraction completes in 2-5s. Async adds job queue complexity unjustified for this exercise.

**Trade-off:** Request blocks during LLM call. With more time, Redis + BullMQ would make this async with polling for results.

### 26. Abstract Extraction Interface with OpenRouter Default

**What:** AI extraction behind `IExtractionService` with factory: real `LLM_API_KEY` → OpenAI-compatible service, empty/dummy → Mock. Default routes through OpenRouter to Gemini (`google/gemini-2.5-flash-lite`); `LLM_BASE_URL` and `LLM_MODEL` are env-configurable.

**Why:** Provider shouldn't be hardcoded. The `openai` SDK supports custom base URLs natively — any OpenAI-compatible endpoint works with env vars only. OpenRouter's compatibility means Gemini, Claude, Llama, etc. all work with zero code changes. Non-compatible providers plug in as a new `IExtractionService` implementation.

**Trade-off:** Only one production implementation today. `LLM_BASE_URL` requires an OpenAI-compatible endpoint; incompatible SDKs need a new class (~50 lines). Depends on OpenRouter as a proxy — one extra network hop. Native SDK eliminates the proxy but adds single-provider complexity.

### 27. Extracted recomputeTotal for Testability

**What:** `recomputeTotal` extracted from `item.service.ts` into `item.utils.ts`.

**Why:** Private function inside `item.service.ts` was impossible to unit test without complex Prisma transaction mocking. Extraction enables direct testing with a mock transaction object.

**Trade-off:** One extra file and import. Direct testing is clearer than testing indirectly through the service with heavier mocking.

---

## If I Had One More Day

Prioritized by user-value-to-effort ratio:

**1. Real-time data synchronization.** Replace `useState`+`useEffect` with React Query for stale-while-revalidate, background refetching, and cache invalidation. Highest-impact UX fix — currently, admin approval doesn't reflect on the user's screen until manual refresh. `refetchOnWindowFocus` handles this with no backend changes. SSE for sub-second sync if needed later.

**2. Background job queue for receipt processing.** Highest-value architectural improvement. Upload returns immediately, frontend polls for results, failures retry gracefully. Unlocks batch receipt uploads. Would add a `/api/receipts/:id/status` endpoint and a worker process in Docker Compose.

**3. Audit trail for status transitions.** `StatusHistory` table recording who, from/to status, timestamp, and optional reason. Most important missing business feature — real expense systems need immutable timelines for compliance. Challenge is making it visible and useful, not just stored.

**4. Pagination and sorting.** Cursor-based pagination with Prisma `cursor`+`take`. Backend is straightforward; frontend needs careful UX around infinite scroll vs. page controls, filter+sort combinations, and responsive loading states.

**5. Confidence scores on AI extraction.** Per-field confidence display builds trust in the AI feature — users accept suggestions more readily when certainty is visible. Modify the LLM prompt to request scores; add color-coded visual indicators per field.

**6. Structured logging with request correlation IDs.** Replace `console.log` with Pino for structured JSON logs, log levels, and request IDs. Correlation IDs flowing from frontend to DB queries tie scattered log lines into a coherent request trace.

**7. UI/UX polish pass.** The current UI is functional but rough — inconsistent spacing, missing loading skeletons, no empty states, and gaps in mobile responsiveness. A dedicated polish pass would tighten component spacing, add skeleton loading states for every data fetch, design proper empty-state messages for lists, and ensure responsive layouts across breakpoints. High user-value, low technical-risk work that significantly improves perceived quality.

---

## AI Extraction v2 — Decoupled Extract-then-Confirm

Redesign from a coupled upload-and-extract pattern to a decoupled three-phase pattern (upload → extract → apply), fixing: (1) new items never received AI pre-fill, (2) extracted values silently overwrote user data, (3) re-extraction required re-uploading.

### 28. Decoupled Upload / Extract / Apply Pattern

**What:** Receipt processing split into three operations: `POST /receipt` (save file, set receiptUrl — no extraction), `POST /receipt/extract` (read-only AI call, returns suggestions with confidence — no DB writes), `POST /receipt/apply` (user explicitly accepts selected fields for persistence and total recomputation).

**Why:** The original single-endpoint design had three flaws: (1) new items never received AI pre-fill because extraction ran after save, (2) extracted values silently overwrote user-typed data, (3) re-extraction required deleting and re-uploading. Decoupling fixes all three. SSE streaming and background job queues were rejected — 90% of the UX gain at 20% of the complexity for a single 2-5s receipt.

**Trade-off:** Three API calls instead of one. New items need a draft row first (see Decision 31).

### 29. Confidence-Based Auto-Accept Threshold

**What:** Extracted fields with confidence ≥ 0.8 auto-populate into form fields (yellow `ai-highlight`). Below 0.8, they appear as suggestion chips requiring explicit Accept. All highlights clear on user edit.

**Why:** Blindly auto-filling every field risks polluting the form — the user must clean it anyway, defeating the purpose. The threshold auto-fills high-confidence data while surfacing uncertain data for review. 0.8 is empirically reasonable; tunable via `EXTRACTION_AUTO_ACCEPT_THRESHOLD` env var.

**Trade-off:** Heuristic, not a guarantee — high-confidence fields can still be wrong. Design optimizes for the common case (accurate extraction → zero extra clicks) while safeguarding the uncommon case (uncertain extraction → explicit accept).

### 30. Category Extraction via LLM

**What:** LLM prompt includes category inference alongside merchant/amount/currency/date. Invalid category values default to `OTHER` server-side.

**Why:** Stitch mockup shows category with `ai-highlight` — designer expected AI to fill it. Withholding it creates friction when merchant context makes the category obvious.

**Trade-off:** Category extraction is inherently lower-confidence than merchant/amount (~0.5-0.7), so suggestions typically appear as Accept chips rather than auto-populated — correct behavior that surfaces the LLM's best guess without forcing it.

### 31. Draft Item for New-Item Receipt Flow

**What:** User drops a receipt → frontend immediately creates a draft item via `POST` (placeholder values), gets a real item ID, then chains upload → extract → review. Cancel deletes the draft; save updates it in-place.

**Why:** Previous approach stored the file in React state and uploaded after save — AI extraction ran after the modal closed, so the user never saw automatic field population (the core feature value). Creating the item first unlocks the full flow for new items, matching the edit-item experience, and eliminates the split code path.

**Trade-off:** Draft items briefly exist as DB records. A concurrent `loadReport()` shows a phantom item and inflates `totalAmount` by the draft's placeholder $0.01 — a transient data issue, not just cosmetic. A separate `Receipt` table was rejected as significantly more complexity for marginal improvement.