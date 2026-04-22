# Expense Report Management System

A full-stack expense report management system with JWT auth, state-machine-driven workflows, receipt upload with AI extraction, and admin review.

## Quick Start

```bash
# Start all services (Postgres, backend, frontend)
docker-compose up --build

# In a separate terminal, run migrations and seed data
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run prisma:seed
```

The app will be available at:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Seeded Accounts

| Role  | Email                          | Password      |
|-------|--------------------------------|---------------|
| Admin | admin@precisionledger.com      | admin123456   |
| User  | user@precisionledger.com       | user123456    |

## Running Without Docker

### Backend

```bash
cd backend
cp .env.example .env        # configure DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev                 # starts on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

The frontend proxies API requests to `http://localhost:3001` in development via Vite's proxy config.

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Default                                | Description                          |
|-------------------|----------------------------------------|--------------------------------------|
| `DATABASE_URL`    | `postgresql://expenseapp:...`          | PostgreSQL connection string         |
| `JWT_SECRET`      | `dev-secret-change-in-production`      | JWT signing key                      |
| `JWT_EXPIRES_IN`  | `7d`                                   | Token TTL                            |
| `OPENAI_API_KEY`  | `sk-dummy`                             | OpenAI key; `dummy` = mock extractor |
| `OPENAI_BASE_URL` | _(empty)_                              | OpenAI-compatible endpoint override  |
| `UPLOAD_DIR`      | `./uploads`                            | Local receipt storage path           |
| `PORT`            | `3001`                                 | Backend port                         |

### Frontend

| Variable          | Default                    | Description              |
|-------------------|----------------------------|--------------------------|
| `VITE_API_URL`    | `http://localhost:3001`    | Backend API base URL     |

## Running Tests

```bash
cd backend
npm test               # all tests (unit + integration)
npm run test:watch     # Jest in watch mode
```

**Unit tests** cover the state machine transitions, service-layer business logic, and Zod validation schemas. **Integration tests** cover the key happy paths: full approval lifecycle, rejection/reopen cycle, item CRUD locking by report status, auth (401/403), and admin input validation.

Integration tests require a running PostgreSQL database (the Docker Compose Postgres service works, or any local instance matching `DATABASE_URL`).

> See `docs/architecture.md` for full testing strategy details.

## Architecture Overview

```
React SPA (Vite)  ──HTTP/REST──►  Express API  ──►  Prisma ORM  ──►  PostgreSQL
                                       │
                                       ├── multer (receipt uploads → local fs)
                                       └── OpenAI API (receipt extraction)
```

**Stack:** Node.js 20 + Express + TypeScript + Prisma + PostgreSQL (backend), React 18 + Vite + TypeScript + Tailwind CSS (frontend).

**Key patterns:**

- **Layered backend:** Routes → Controller (thin) → Service (business logic + state machine) → Prisma (data). No business logic in controllers.
- **State machine:** `DRAFT → SUBMITTED → APPROVED` (terminal). `REJECTED → DRAFT` via explicit reopen. Items locked when report is not in DRAFT/REJECTED.
- **Total amount:** Stored on `ExpenseReport.totalAmount`, recomputed in a Prisma transaction on every item change.
- **AI extraction:** `IExtractionService` interface with OpenAI and mock implementations. Synchronous extraction on upload. `OPENAI_BASE_URL` supports any OpenAI-compatible endpoint.
- **Auth:** JWT with bcrypt. RBAC middleware typed to Prisma's `Role` enum.

See `docs/architecture.md` for full details and `DECISIONS.md` for trade-off rationale.

## AI Usage Note

<!-- TODO: Fill in with your actual experience. Suggested structure:

**Tools used:** [e.g., Claude Code (opencode CLI), Cursor, Stitch for design prototyping, etc.]

**How they helped:** [e.g., Scaffolding project structure, generating state machine logic, converting Stitch HTML exports to JSX components, writing unit tests, etc.]

**Where I overrode or corrected output:** [e.g., Stitch mockup included a role selector on signup that contradicted security requirements — removed it. AI suggested real-time data sync (polling/WebSockets) which was deferred as out of scope for a demo. Pushed back on async receipt extraction in favor of synchronous approach for simplicity. Corrected AI-generated code that placed business logic in controllers by moving it to the service layer, etc.]

-->

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/           # env, JWT, multer config
│   │   ├── middleware/       # auth, RBAC, error handler
│   │   ├── modules/
│   │   │   ├── auth/         # signup, login
│   │   │   ├── reports/      # report CRUD + state machine
│   │   │   ├── items/        # item CRUD with status locking
│   │   │   ├── receipts/     # upload + AI extraction
│   │   │   └── admin/        # list all, approve, reject
│   │   ├── common/           # error classes, shared types
│   │   ├── app.ts            # Express setup
│   │   └── server.ts         # entry point
│   ├── prisma/               # schema, migrations, seed
│   ├── tests/
│   │   ├── unit/             # state machine, services, utils
│   │   └── integration/      # API-level tests with DB
│   └── uploads/              # receipt files (gitignored)
├── frontend/
│   ├── src/
│   │   ├── api/              # axios client + endpoint functions
│   │   ├── components/       # reusable UI components
│   │   ├── pages/            # route-level views
│   │   ├── hooks/            # custom React hooks
│   │   ├── context/          # auth context
│   │   └── types/            # TypeScript interfaces
│   └── ...
├── docs/
│   ├── architecture.md       # system design, API endpoints, testing
│   └── plan.md               # implementation phases & progress
├── stitch_expense_management_system/  # Stitch design prototypes (HTML + PNG)
├── CLAUDE.md                 # project context for AI tools
├── DECISIONS.md              # stack choices, trade-offs, "one more day"
└── docker-compose.yml        # Postgres + backend + frontend
```