# Implementation Plan

## Phase 1: Infrastructure & Scaffolding (~45 min)

**Sequential — everything depends on this.**

- [x] Initialize git repository
- [x] Create project structure (backend/, frontend/ directories)
- [x] Write docker-compose.yml (Postgres service)
- [x] Backend: package.json, tsconfig.json, Prisma schema, .env.example
- [x] Frontend: scaffold with Vite (React + TypeScript + Tailwind)
- [x] Write CLAUDE.md, DECISIONS.md, docs/architecture.md, docs/plan.md
- [x] Design UI screens in Stitch → exported to `stitch_expense_management_system/`

**Can be parallelized via worktree:** No — this is the foundation.

---

## Phase 2: Auth (~1 hr)

**2a (backend) and 2b (frontend) can run in PARALLEL via worktrees.**

### 2a: Backend Auth
- [x] Prisma User model + migration
- [x] POST /api/auth/signup (validate, hash password, return JWT)
- [x] POST /api/auth/login (validate, compare hash, return JWT)
- [x] Auth middleware (verify JWT, attach req.user)
- [x] RBAC middleware (requireRole)
- [x] Seed script: create admin user

### 2b: Frontend Auth
- [x] API client (axios instance with interceptor for JWT)
- [x] Auth context + useAuth hook
- [x] Login page
- [x] Signup page
- [x] Protected route component
- [x] App routing setup (React Router)

---

## Phase 3: Core Domain — Reports & Items (~1.5 hr)

**3a (backend) and 3b (frontend) can run in PARALLEL via worktrees.**

### 3a: Backend Reports + Items
- [x] Prisma ExpenseReport + ExpenseItem models + migration
- [x] ReportService with state machine validation
- [x] Unit tests for state machine (all transitions + invalid transitions + guard functions)
- [x] Report CRUD routes (create, read own, update, delete)
- [x] Report submit endpoint (DRAFT → SUBMITTED, validates non-empty)
- [x] Report reopen endpoint (REJECTED → DRAFT, explicit user action)
- [x] Item CRUD routes (create, read, update, delete — DRAFT/REJECTED status only)
- [x] Total amount recomputation in transaction
- [x] List with status filter (no pagination)
- [x] findOwnedReport utility with ownership check and optional include param
- [x] Single-query getById (items included via findOwnedReport include param)
- [x] State machine throws StateTransitionError/ValidationError (not plain Error) for proper HTTP status mapping
- [x] Edit guards: canEditItems and canEditMetadata allow DRAFT + REJECTED (per spec: "user regains edit rights")

**Remaining unit tests (not blocking but should be added before Phase 6):**
- [x] Unit tests for total amount recomputation (add item, update item amount, delete item, multiple items sum)
- [x] Unit tests for item CRUD locked by report status (edit/create/delete blocked in SUBMITTED/APPROVED, allowed in DRAFT/REJECTED)
- [x] Unit tests for delete-only-in-DRAFT rule
- [x] Unit tests for report ownership (user cannot access/modify another user's report)

### 3b: Frontend Report UI
- [x] Report list page (with status filter tabs)
- [x] Report create form
- [x] Report detail page (items table, status badge, submit button)
- [x] Item add/edit form
- [x] Item delete button
- [x] Status transition UI (submit button, status indicators)

---

## Phase 4: Receipt Upload + AI Extraction (~1 hr)

**Sequential — depends on Phase 3.**

### 4a: Backend Receipt Upload + AI Extraction
- [ ] Multer config for file uploads (PDF, PNG, JPG, WEBP; max 10MB)
- [ ] `POST /api/reports/:reportId/items/:id/receipt` — save file to `backend/uploads/`, store path on `item.receiptUrl`
- [ ] OpenAI integration: send image/PDF to GPT-4o-mini, extract merchant_name, amount, currency, transaction_date
- [ ] Return extracted data in upload response alongside updated item
- [ ] Mock extraction service for development (returns static data when `OPENAI_API_KEY=dummy`)

### 4b: Frontend Receipt UI
- [ ] Receipt upload button on item form (file input, drag-and-drop)
- [ ] Loading state during extraction (spinner, "Analyzing receipt..." banner)
- [ ] Pre-fill form with extracted data (editable text fields, user can override any value)
- [ ] Receipt preview: show uploaded image/PDF thumbnail next to form

---

## Phase 5: Admin Endpoints + UI (~45 min)

**5a (backend) and 5b (frontend) can run in PARALLEL via worktrees.**

### 5a: Backend Admin
- [ ] `GET /api/admin/reports` — list all reports across all users, `?status=` and `?userId=` filters
- [ ] `POST /api/admin/reports/:id/approve` — SUBMITTED → APPROVED (uses state machine `transition()`)
- [ ] `POST /api/admin/reports/:id/reject` — SUBMITTED → REJECTED (uses state machine `transition()`)
- [ ] RBAC: `requireRole('admin')` middleware on all admin routes
- [ ] Admin routes mounted at `/api/admin` in app.ts

### 5b: Frontend Admin
- [ ] Admin route (protected, admin-only, redirects non-admin to /reports)
- [ ] Admin report list (all users, status filter tabs)
- [ ] Approve/reject action buttons on SUBMITTED reports
- [ ] Admin report detail view (read-only, shows items and status history)

---

## Phase 6: Integration Tests (~30 min)

**Sequential — depends on all backend phases.**

Test setup: Jest + Supertest, test database with per-suite setup/teardown, seed admin + test user.

- [ ] Integration test: DRAFT → SUBMITTED → APPROVED happy path
  - Create user, create report, add items, submit, admin approve
- [ ] Integration test: DRAFT → SUBMITTED → REJECTED → DRAFT → SUBMITTED
  - Full rejection cycle: submit, reject, reopen, edit, re-submit
- [ ] Integration test: item CRUD locked in SUBMITTED/APPROVED status
  - Assert 400 on create/update/delete when report not in DRAFT/REJECTED
- [ ] Integration test: auth (401 unauthorized, 403 wrong role on admin routes)
  - Request without token → 401, regular user on /api/admin → 403

---

## Phase 7: Documentation & Polish (~30 min)

**Sequential — final pass.**

- [ ] Write README.md — setup instructions (docker-compose up, seed, env vars), architecture overview, test commands
- [ ] Write AI usage note — tools used, how they helped, where I overrode output (in README or separate file)
- [ ] Review DECISIONS.md completeness — ensure all trade-offs documented
- [ ] Clean git history — ensure meaningful messages, no giant commits
- [ ] Final `docker-compose up --build` smoke test

---

## Parallelization Summary

```
Phase 1 ──► Phase 2a ──► Phase 3a ──► Phase 4a ──► Phase 5a ──► Phase 6 ──► Phase 7
          └─► Phase 2b ──► Phase 3b ──► Phase 4b ──► Phase 5b ────────────────┘

Phases parallelizable via worktree:
  - 2a || 2b  (backend auth || frontend auth scaffolding)
  - 3a || 3b  (backend domain || frontend domain UI)
  - 5a || 5b  (backend admin || frontend admin UI)
```

Total estimated time: ~6 hours