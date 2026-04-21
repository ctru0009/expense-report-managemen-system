# Architecture

## Design Prototyping with Stitch

Before writing frontend code, all UI screens were designed using **Stitch** (AI design tool) and exported as HTML prototypes to `stitch_expense_management_system/`. Each screen has a `code.html` (standalone HTML+CSS) and a `screen.png` screenshot:

| Screen | Purpose |
|---|---|
| `login/` | Login form |
| `sign_up/` | Registration form |
| `my_reports/` | User's report list with status filters |
| `report_detail_draft/` | Report detail with items table, submit button |
| `add_expense_item_ai_extracted/` | Item form with receipt upload + AI extraction states |
| `admin_dashboard/` | Admin view: all reports, approve/reject actions |

The design system ("The Precision Ledger") uses a tonal navy/gray palette with no hard borders — depth via background shifts instead. Key tokens are in `fiscal_slate/DESIGN.md`.

**Why this approach:** Stitch generates production-quality HTML+CSS mockups that serve as visual specs. This is more token-efficient than describing UI in text — agents can reference the exported HTML for exact layout, colors, and spacing instead of guessing. It also catches design issues before any React code is written.

## System Overview

```
┌──────────────┐       ┌──────────────────────────────────┐
│              │  HTTP  │         Backend (Express)        │
│   React SPA  │◄─────►│                                  │
│   (Vite)     │  REST  │  ┌─────────┐    ┌───────────┐  │
│              │       │  │ Routes/  │───►│ Services  │  │
│  Port 5173   │       │  │Controllers│    │           │  │
│              │       │  └─────────┘    └─────┬─────┘  │
└──────────────┘       │                        │         │
                       │                   ┌────▼────┐    │
                       │                   │ Prisma  │    │
                       │                   │  ORM    │    │
                       │                   └────┬────┘    │
                       │                        │         │
                       └────────────────────────┼─────────┘
                                                │
                       ┌────────────────────────▼─────────┐
                       │         PostgreSQL (5432)         │
                       └──────────────────────────────────┘

File uploads → backend/uploads/ (local filesystem)
AI extraction → OpenAI API (external)
```

## Data Model

```prisma
User
  id          UUID      @id @default(uuid())
  email       String    @unique
  password    String    // bcrypt hash
  role        Role      // USER | ADMIN
  reports     ExpenseReport[]
  createdAt   DateTime

ExpenseReport
  id           UUID      @id @default(uuid())
  userId       UUID      @relation -> User
  title        String
  description  String?
  status       ReportStatus  // DRAFT | SUBMITTED | APPROVED | REJECTED
  totalAmount  Decimal  @default(0)  // recomputed on item changes
  items        ExpenseItem[]
  createdAt    DateTime
  updatedAt    DateTime

ExpenseItem
  id              UUID      @id @default(uuid())
  reportId        UUID      @relation -> ExpenseReport (cascade delete)
  amount          Decimal
  currency        String    @default("USD")
  category        Category  // enum
  merchantName    String
  transactionDate DateTime
  receiptUrl      String?   // local file path
  createdAt       DateTime
  updatedAt       DateTime
```

## State Machine

```
  DRAFT ──[submit]──► SUBMITTED ──[approve]──► APPROVED (terminal)
    ▲                      │
    │                      │ [reject]
    └──────────────────────┘
                       REJECTED
```

Valid transitions:
- DRAFT → SUBMITTED (user submits)
- SUBMITTED → APPROVED (admin approves)
- SUBMITTED → REJECTED (admin rejects)
- REJECTED → DRAFT (user explicitly reopens — required before re-submit)
- Delete only allowed from DRAFT

Edit guards:
- Items editable in DRAFT and REJECTED (user regains edit rights on rejection per spec)
- Report metadata editable in DRAFT and REJECTED
- Submit only from DRAFT (must have ≥1 item)
- Re-submit requires REOPEN first (REJECTED → DRAFT → SUBMITTED)

## API Endpoints

### Auth
- `POST /api/auth/signup` — register (user role)
- `POST /api/auth/login` — login, returns JWT

### Reports (User)
- `GET    /api/reports` — list own reports, `?status=` filter
- `POST   /api/reports` — create report
- `GET    /api/reports/:id` — get own report with items
- `PUT    /api/reports/:id` — update title/description (DRAFT/REJECTED only)
- `DELETE /api/reports/:id` — delete (DRAFT only)
- `POST   /api/reports/:id/submit` — DRAFT → SUBMITTED
- `POST   /api/reports/:id/reopen` — REJECTED → DRAFT (explicit user action)

### Items
- `GET    /api/reports/:reportId/items` — list items
- `POST   /api/reports/:reportId/items` — add item (DRAFT only)
- `PUT    /api/reports/:reportId/items/:id` — edit item
- `DELETE /api/reports/:reportId/items/:id` — delete item

### Receipts
- `POST   /api/reports/:reportId/items/:itemId/receipt` — upload receipt, returns extracted data + updated item
- `DELETE /api/reports/:reportId/items/:itemId/receipt` — remove receipt from item

### Receipt Upload & AI Extraction Flow

```
Client                          Backend                         AI Provider
  │                                │                              │
  │──POST /items/:itemId/receipt──►│                              │
  │  (multipart: file)            │                              │
  │                               │──save to uploads/           │
  │                               │──IExtractionService.extract─►│
  │                               │◄──ExtractedData────────────│
  │                               │──update item + recompute──  │
  │◄──{ item, extracted }────────│                              │
  │                               │                              │
  │  (user reviews, edits, saves) │                              │
  │──PUT /items/:itemId──────────►│                              │
  │  (final values)               │                              │
```

- **Synchronous extraction**: upload blocks until LLM responds (2-5s typical). Frontend shows loading spinner.
- **File storage**: local filesystem at `backend/uploads/`. `receiptUrl` stores `/uploads/<filename>`. Static serving is mounted at `/uploads`.
- **Provider abstraction**: `IExtractionService` interface with two implementations — `OpenAIExtractionService` (real calls via OpenAI SDK) and `MockExtractionService` (static data). Factory selects based on `OPENAI_API_KEY`.
- **OpenAI-compatible providers**: set `OPENAI_BASE_URL` to any OpenAI-compatible endpoint (LiteLLM, Ollama, OpenRouter, Together AI). No code changes required.
- **Mockable**: `OPENAI_API_KEY=dummy` or empty falls back to mock extractor returning static data.
- **Accepted formats**: PDF, PNG, JPG, WEBP (max 10MB via multer config).
- **Extraction updates item**: extracted fields (merchantName, amount, currency, transactionDate) are written back to the item and total is recomputed in a transaction.

### Admin
- `GET    /api/admin/reports` — list all reports, `?status=` filter, `?userId=` filter
- `POST   /api/admin/reports/:id/approve` — SUBMITTED → APPROVED
- `POST   /api/admin/reports/:id/reject` — SUBMITTED → REJECTED

## Auth Flow

1. Client sends `POST /api/auth/login` with email + password
2. Server validates, returns `{ token, user }`
3. Client stores token, sends `Authorization: Bearer <token>` on subsequent requests
4. `authMiddleware` verifies JWT, attaches `req.user = { userId, role }`
5. `requireRole('admin')` middleware restricts admin endpoints

## Error Handling

All errors return JSON:
```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot approve a report in DRAFT status"
  }
}
```

HTTP status codes:
- 400 — validation errors, bad transitions
- 401 — missing/invalid token
- 403 — insufficient role
- 404 — resource not found
- 409 — duplicate email
- 500 — unexpected errors

## Frontend Architecture

```
React SPA with React Router v6
├── /login          → Login page
├── /signup         → Signup page
├── /reports        → User's report list (with status filter)
├── /reports/:id    → Report detail + items + submit button
├── /reports/new    → Create report form
└── /admin          → Admin dashboard (all reports, approve/reject)

State management: React Context for auth, local state + fetch hooks for data.
No Redux/Zustand — scope doesn't justify it.
```

## Testing Strategy

### Unit Tests

- **State machine**: all valid/invalid transitions, `canEditItems`, `canEditMetadata`, `canDelete` guard functions. Located in `backend/tests/unit/report-state-machine.test.ts`.
- Tests use `StateTransitionError` and `ValidationError` assertions (not generic `Error`) to verify proper HTTP status code mapping.

### Integration Tests (Phase 6)

Integration tests hit running API endpoints with a real database:

1. **DRAFT → SUBMITTED → APPROVED**: create report, add item, submit, admin approve.
2. **DRAFT → SUBMITTED → REJECTED → DRAFT → SUBMITTED**: full rejection-reopen-resubmit cycle.
3. **Item CRUD locked in SUBMITTED**: assert 400 on create/update/delete items when report is SUBMITTED.
4. **Auth**: unauthenticated requests return 401; non-admin on admin routes returns 403.

Tests use Jest + Supertest against the Express app with a test database. Setup/teardown scripts seed and clean the database per test suite.
