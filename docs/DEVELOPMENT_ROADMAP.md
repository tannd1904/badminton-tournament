# Development Roadmap & Implementation Plan

## 1. Phase Dependency Graph

```text
[Phase 0: Inspection & Planning]
              │
              ▼
[Phase 1: Project Foundation & Tooling]
              │
              ▼
[Phase 2: Auth & Dual-Level RBAC]
              │
              ▼
[Phase 3: Tournament & Event Setup]
              │
              ▼
[Phase 4: Registration & Partner Pairing]
              │
              ▼
[Phase 5: Tournament Engine (Draw & Brackets)]
              │
              ▼
[Phase 6: Smart Scheduling & Gantt Timeline]
              │
              ▼
[Phase 7: Match Officiating & Scoring Engine]
              │
              ▼
[Phase 8: Real-Time Sync & Public Experience (OBS)]
              │
              ▼
[Phase 9: Admin Portal, Analytics & Audit Logs]
              │
              ▼
[Phase 10: Testing, Verification & Production Packaging]
```

---

## 2. Phase-by-Phase Roadmap & Milestones

### Phase 0: Repository Inspection & Planning (Current Phase)
- **Deliverables**: Repository audit, System Architecture, Database ERD, Tournament Engine Specification, Scoring Engine Specification, Scheduling Algorithm, RBAC Matrix, API Specification, Roadmap, and Phase 1 Action Plan.
- **Status**: Completed.

### Phase 1: Project Foundation & Tooling
- **Goals**: Initialize monorepo / multi-package root, NestJS 10 backend with Prisma ORM, PostgreSQL connection, Next.js 14 App Router frontend with Tailwind CSS and shadcn/ui components, Docker Compose configuration, health-check endpoints.
- **Deliverables**:
  - `backend/` initialized with TypeScript strict mode, global validation pipe, HttpException filter, Prisma schema.
  - `frontend/` initialized with Next.js 14, Tailwind, UI tokens, Axios/Fetch client.
  - `docker-compose.yml` for Postgres & Redis.
  - Health check: `GET /api/v1/health`.

### Phase 2: Authentication & Dual-Level RBAC
- **Goals**: User registration, login, JWT access/refresh token rotation, password hashing with Argon2, user profile endpoints.
- **Deliverables**:
  - `AuthModule` (Register, Login, Refresh, Logout, Profile).
  - Guards: `JwtAuthGuard`, `SystemRolesGuard`, `TournamentStaffGuard`.
  - Frontend Auth views: Sign in, Sign up, Protected Route middleware.

### Phase 3: Tournament & Event Lifecycle Management
- **Goals**: Multi-step Tournament Creation Wizard, venue and court management, event categories setup, status state machine (Draft -> Registration Open -> Completed).
- **Deliverables**:
  - `TournamentsModule`, `EventsModule`, `VenuesModule`, `CourtsModule`.
  - Step wizard on frontend for organizers with rich-text regulation editor.

### Phase 4: Athlete Registration & Partner Pairing
- **Goals**: Athlete self-registration, doubles invitation & acceptance workflow, registration queue management (Approve / Reject / Waitlist), fee tracking, court-side check-in.
- **Deliverables**:
  - `RegistrationsModule`, `ParticipantsModule`.
  - Registration review table with filters, search, and bulk status updates.

### Phase 5: Tournament Engine (Draws & Brackets)
- **Goals**: Automatic & Manual Draw generator for Single Elimination, Round Robin, and Round Robin then Knockout. Seeding distribution and Same-Club Avoidance constraint solver.
- **Deliverables**:
  - `BracketsModule`, `StagesModule`, `GroupsModule`.
  - Visual dynamic bracket canvas with zoom/pan and live progression paths.

### Phase 6: Smart Scheduling Engine & Timeline
- **Goals**: Multi-court CSP scheduler, estimated match duration, mandatory rest buffer, conflict detection, Lock Time enforcement, dynamic ripple rescheduling.
- **Deliverables**:
  - `SchedulingModule`.
  - Interactive court Gantt timeline with drag-and-drop match placement and conflict alerts.

### Phase 7: Match Officiating & Scoring Engine (BWF Rally Points)
- **Goals**: Court-side Umpire Scoreboard (PWA, mobile first). 21-point rally scoring with 2-point lead deuce (capped at 30), doubles service rotation, atomic undo, match completion and bracket winner advancement.
- **Deliverables**:
  - `MatchesModule`, `ScoringModule`.
  - Tactile, single-hand touch Scoreboard UI (`/umpire/match/[id]`).

### Phase 8: Real-Time Synchronization & OBS Livestream Overlay
- **Goals**: Sub-second score sync via Socket.IO, room-based partitioning, optimistic UI reconciliation, OBS browser overlay (`/overlay/[token]`).
- **Deliverables**:
  - `RealtimeModule` (Socket.IO gateway).
  - Public Live Score ticker, real-time bracket hydration, transparent OBS overlay.

### Phase 9: Super Admin Portal, Analytics & Auditing
- **Goals**: Global system management, tournament moderation, venue/sports catalog, comprehensive audit trail, report generation (CSV/Excel).
- **Deliverables**:
  - `AdminModule`, `AuditLogsModule`, `AnalyticsModule`.
  - Super Admin Dashboard with operational metrics and safety controls.

### Phase 10: Testing, Verification & Production Packaging
- **Goals**: Complete test suite (Engine unit tests, scoring edge case tests, scheduling conflict tests, integration tests, E2E flows), Docker production build, documentation.
- **Deliverables**:
  - Jest & Supertest suites.
  - Seed script with realistic multi-tournament test data.
  - Production deployment guide.

---

## 3. Technical Risks & Mitigation Strategies

| Risk Category | Technical Risk | Mitigation Strategy |
|---|---|---|
| **Realtime Concurrency** | Two clients or rapid clicks causing duplicate score events. | Backend enforces `idempotencyKey` uniqueness and monotonic version checking in PostgreSQL transaction. |
| **Network Flakiness** | Court-side tablet loses WiFi connection during match. | Umpire PWA buffers actions locally in indexedDB, displays connection badge, and reconciles snapshots seamlessly upon reconnect. |
| **Scheduling Complexity** | Constraint explosion when scheduling large tournaments with multiple overlaps. | CSP solver employs prioritized greedy heuristics with localized backtracking; fallback to manual override with explicit conflict markers. |
| **Data Consistency** | Server crash mid-bracket promotion causing orphaned match progression. | Bracket advancement is executed within a single ACID transaction (`prisma.$transaction`). |

