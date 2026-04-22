# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense Report Management System — a full-stack app for the Gradion senior fullstack take-home assessment. Users create expense reports with line items and receipt uploads; admins approve/reject them. AI extraction pre-fills receipt data via LLM.

## Stack

- **Backend:** Node.js 20 + Express + TypeScript + Prisma ORM + PostgreSQL
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Auth:** JWT (jsonwebtoken + bcrypt)
- **File upload:** multer → local filesystem (`backend/uploads/`)
- **AI extraction:** OpenAI API (mockable)
- **Testing:** Jest + Supertest

## Commands

```bash
# Start all services (Postgres, backend, frontend)
docker-compose up --build

# Backend only (from backend/)
npm run dev          # dev server with hot reload (ts-node-dev)
npm run build        # compile TypeScript
npm test             # run Jest tests
npm run test:watch   # Jest in watch mode
npm run prisma:migrate   # run pending migrations
npm run prisma:seed      # seed admin user + sample data
npm run prisma:studio    # open Prisma Studio

# Frontend only (from frontend/)
npm run dev          # Vite dev server
npm run build        # production build
npm run preview      # preview production build
```

## Design Prototypes

UI screens were designed in Stitch and exported to `stitch_expense_management_system/` as standalone HTML+CSS files. Each screen folder has `code.html` and `screen.png`. The design system ("The Precision Ledger") is in `stitch_expense_management_system/fiscal_slate/DESIGN.md`.

When building frontend components, reference the exported HTML for exact layout, spacing, and color tokens. Before implementing any Stitch-based UI screen, first break the design into reusable React components (layout primitives, shared form controls, tables/cards, and repeated sections), then compose the page from those components. Key screens:
- `login/`, `sign_up/` — auth forms
- `my_reports/` — user report list with status filters
- `report_detail_draft/` — report detail + items table
- `add_expense_item_ai_extracted/` — item form with receipt upload + AI extraction states
- `admin_dashboard/` — admin view with approve/reject

## Architecture

```
Monorepo (no workspace tooling — separate package.json per app)

backend/
  src/
    config/          # env, JWT config, multer config
    middleware/       # auth (JWT verification), RBAC (role checks), error handler
    modules/
      auth/          # signup, login routes + service
      reports/       # CRUD + submit + state machine service
      items/         # CRUD for expense items, locked by report status
      admin/         # list all reports, approve, reject
      receipts/      # upload endpoint + AI extraction
    common/
      errors/        # AppError, NotFoundError, StateTransitionError
      types/         # shared TypeScript types
    app.ts           # Express app setup, middleware wiring
    server.ts        # entry point
  prisma/
    schema.prisma    # DB schema (User, ExpenseReport, ExpenseItem)
    migrations/      # Prisma migrations
    seed.ts          # seed script
  tests/
    unit/            # state machine tests, service tests
    integration/     # API route tests with DB

frontend/
  src/
    api/             # axios client + endpoint functions
    components/      # reusable UI components
    pages/           # route-level views
    hooks/           # custom React hooks (auth, data fetching)
    types/           # TypeScript interfaces mirroring backend
    context/         # React context for auth state
```

### Key Patterns

- **Layered backend:** Routes → Controller (thin) → Service (business logic) → Prisma (data). State machine validation lives in the service layer only.
- **Status state machine:** DRAFT → SUBMITTED → APPROVED (terminal). REJECTED → DRAFT requires an explicit "reopen" action by the user (`POST /api/reports/:id/reopen`). Items only editable in DRAFT status.
- **Total amount:** Stored on `ExpenseReport.totalAmount`, recomputed on every item change within a transaction.
- **No pagination:** List endpoints return all results. Filter by `?status=` only.

## Environment Variables

Backend reads from `.env` (see `backend/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — signing key
- `JWT_EXPIRES_IN` — token TTL (default 7d)
- `OPENAI_API_KEY` — for receipt extraction (can be dummy for dev)
- `LLM_API_KEY` — primary key for AI extraction (takes priority over OPENAI_API_KEY)
- `LLM_BASE_URL` — OpenAI-compatible API base URL (default https://openrouter.ai/api/v1)
- `LLM_MODEL` — model name for extraction (default google/gemini-2.0-flash-001)
- `UPLOAD_DIR` — local upload path (default ./uploads)
- `PORT` — backend port (default 3001)

Frontend reads from `.env`:
- `VITE_API_URL` — backend URL (default http://localhost:3001)

### Docker Compose environment

`docker-compose.yml` uses `${VAR:-default}` syntax to read LLM config from the **root `.env` file** (next to `docker-compose.yml`). These override the backend's own `.env` because Docker Compose env vars take precedence. To configure AI extraction when running via Docker Compose, set these in the root `.env`:

- `LLM_API_KEY` — required for real AI extraction; if empty or omitted, mock extraction is used
- `LLM_BASE_URL` — defaults to `https://openrouter.ai/api/v1`
- `LLM_MODEL` — defaults to `google/gemini-2.0-flash-001`

The extraction factory (`backend/src/modules/receipts/extraction.factory.ts`) selects `MockExtractionService` when the key is empty or `'dummy'`, and `OpenAIExtractionService` otherwise. The instance is re-evaluated if the API key changes between calls (not just cached forever).
