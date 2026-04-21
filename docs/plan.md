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
- [ ] Prisma User model + migration
- [ ] POST /api/auth/signup (validate, hash password, return JWT)
- [ ] POST /api/auth/login (validate, compare hash, return JWT)
- [ ] Auth middleware (verify JWT, attach req.user)
- [ ] RBAC middleware (requireRole)
- [ ] Seed script: create admin user

### 2b: Frontend Auth
- [ ] API client (axios instance with interceptor for JWT)
- [ ] Auth context + useAuth hook
- [ ] Login page
- [ ] Signup page
- [ ] Protected route component
- [ ] App routing setup (React Router)

---

## Phase 3: Core Domain — Reports & Items (~1.5 hr)

**3a (backend) and 3b (frontend) can run in PARALLEL via worktrees.**

### 3a: Backend Reports + Items
- [ ] Prisma ExpenseReport + ExpenseItem models + migration
- [ ] ReportService with state machine validation
- [ ] Unit tests for state machine (all transitions + invalid transitions)
- [ ] Report CRUD routes (create, read own, update, delete)
- [ ] Report submit endpoint (DRAFT → SUBMITTED)
- [ ] Item CRUD routes (create, read, update, delete — locked by status)
- [ ] Total amount recomputation in transaction
- [ ] List with status filter

### 3b: Frontend Report UI
- [ ] Report list page (with status filter tabs)
- [ ] Report create form
- [ ] Report detail page (items table, status badge, submit button)
- [ ] Item add/edit form
- [ ] Item delete button
- [ ] Status transition UI (submit button, status indicators)

---

## Phase 4: Receipt Upload + AI Extraction (~1 hr)

**Sequential — depends on Phase 3.**

- [ ] Multer config for file uploads
- [ ] POST receipt upload endpoint (save file, store path)
- [ ] OpenAI integration: send image/PDF, extract merchant/amount/currency/date
- [ ] Return extracted data in upload response
- [ ] Frontend: receipt upload button on item form
- [ ] Frontend: loading state during extraction
- [ ] Frontend: pre-fill form with extracted data (editable override)

---

## Phase 5: Admin Endpoints + UI (~45 min)

**5a (backend) and 5b (frontend) can run in PARALLEL via worktrees.**

### 5a: Backend Admin
- [ ] GET /api/admin/reports (all users, filterable by status)
- [ ] POST /api/admin/reports/:id/approve
- [ ] POST /api/admin/reports/:id/reject
- [ ] RBAC: require admin role on all admin routes

### 5b: Frontend Admin
- [ ] Admin route (protected, admin-only)
- [ ] Admin report list (all users, status filter)
- [ ] Approve/reject buttons on submitted reports
- [ ] Admin report detail view

---

## Phase 6: Integration Tests (~30 min)

**Sequential — depends on all backend phases.**

- [ ] Integration test: DRAFT → SUBMITTED → APPROVED happy path
- [ ] Integration test: DRAFT → SUBMITTED → REJECTED → DRAFT → SUBMITTED
- [ ] Integration test: item CRUD locked in SUBMITTED status
- [ ] Integration test: auth (unauthorized, wrong role)

---

## Phase 7: Documentation & Polish (~30 min)

**Sequential — final pass.**

- [ ] Write README.md (setup instructions, architecture, test commands)
- [ ] Write AI usage note
- [ ] Review DECISIONS.md completeness
- [ ] Clean git history (squash if needed, meaningful messages)
- [ ] Final `docker-compose up --build` smoke test

---

## Parallelization Summary

```
Phase 1 ──► Phase 2a ──► Phase 3a ──► Phase 4 ──► Phase 5a ──► Phase 6 ──► Phase 7
         └─► Phase 2b ──► Phase 3b ──────────► Phase 5b ────────────────┘

Phases parallelizable via worktree:
  - 2a || 2b  (backend auth || frontend auth scaffolding)
  - 3a || 3b  (backend domain || frontend domain UI)
  - 5a || 5b  (backend admin || frontend admin UI)
```

Total estimated time: ~6 hours
