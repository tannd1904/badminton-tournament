# Badminton Tournament Management Platform — System Architecture

## 1. Executive Overview

The Badminton Tournament Management Platform is an enterprise-grade, high-concurrency, real-time tournament operations system designed for badminton federations, tournament organizers, umpires, athletes, and spectators.

The system is structured as a **Modular Monolith** with domain-driven boundaries, ensuring rapid development, zero cross-service network latency during initial deployment, high transactional consistency, and a seamless path to microservices decomposition when vertical scaling thresholds are met.

---

## 2. High-Level Architecture Topology

```
                                  [ SPECTATORS / ATHLETES / ORGANIZERS / UMPIRES / OBS ]
                                                             │
                                        HTTPS / WSS (TLS Termination)
                                                             │
                                                     ┌───────▼───────┐
                                                     │     NGINX     │
                                                     │ Reverse Proxy │
                                                     └───┬───────┬───┘
                                                         │       │
                                 ┌───────────────────────┘       └────────────────────────┐
                                 │ :3000 (SSR / Static)                                   │ :4000 (API & WS)
                         ┌───────▼────────┐                                       ┌───────▼────────┐
                         │    NEXT.JS     │                                       │     NESTJS     │
                         │   App Router   │                                       │ Backend Server │
                         └────────────────┘                                       └───┬────────────┘
                                                                                      │
                                   ┌──────────────────────────────────────────────────┴──────────────────┐
                                   │                                                                     │
                         ┌─────────▼─────────┐                                                 ┌─────────▼─────────┐
                         │    POSTGRESQL     │                                                 │       REDIS       │
                         │    Primary DB     │                                                 │ Cache, Pub/Sub,   │
                         │ (ACID & Relations)│                                                 │ Distributed Locks │
                         └───────────────────┘                                                 └───────────────────┘
```

---

## 3. Subsystem Breakdown

### 3.1. Frontend Subsystems (Next.js 14 App Router)
1. **Public Portal (`/`)**:
   - Tournament discovery, event regulations, seedings, dynamic bracket visualization, live multi-court schedule, live score ticker, standings tables.
   - Zero-authentication read path optimized for static generation (ISR) and real-time client hydration.
2. **Athlete Portal (`/athlete`)**:
   - Profile management, tournament & event registration, partner invitation workflow, payment receipt tracking, personal match schedule, match notifications.
3. **Organizer Dashboard (`/organizer`)**:
   - Tournament configuration wizard, event setup, registration review & check-in, seeding manager, drag-and-drop draw generator, multi-court Gantt timeline scheduler, dynamic rescheduling engine, referee assignment, announcement broadcast.
4. **Umpire Scoreboard (`/umpire`)**:
   - Mobile-first PWA interface optimized for single-hand touch operation on court-side tablets and smartphones. Tactile score buttons, rally-point deuce engine, service court rotation display, instant undo with event-sourcing history, set/match completion.
5. **Livestream Overlay (`/overlay/[token]`)**:
   - Transparent OBS Browser Source overlay updating via sub-second WebSocket pushes. Displays court name, player names, club badges, current set, game scores, and service indicator.
6. **System Admin Portal (`/admin`)**:
   - Platform-wide governance: tournament approval/suspension, user management, sports & venues catalog, audit logs, media storage quota, platform health metrics.

### 3.2. Backend Core Modules (NestJS)
- **`AuthModule` & `RolesPermissionsModule`**: JWT authentication, refresh token rotation, hierarchical RBAC (System Super Admin vs. Tournament Staff).
- **`TournamentsModule` & `TournamentStaffModule`**: Multi-state tournament lifecycle engine (Draft to Completed).
- **`SportsModule`, `ClubsModule`, `VenuesModule`, `CourtsModule`**: Master entities for physical and organizational assets.
- **`EventsModule` & `RegistrationsModule`**: Event rule configurations, single/double entries, partner pairing verification, approval lifecycle.
- **`StagesModule`, `GroupsModule`, `BracketsModule`**: Tournament Engine domain services (Knockout trees, Berger round-robin tables, seeding, same-club avoidance).
- **`SchedulingModule`**: CSP-based multi-court scheduler, conflict detection, lock-time guarantees, cascading reschedule on match overruns.
- **`MatchesModule` & `ScoringModule`**: State machine (Scheduled -> Ready -> In Progress -> Completed), official BWF rally-point scoring rules, doubles service rotation, idempotent score event logging, undo engine, automatic bracket winner progression.
- **`RealtimeModule`**: Socket.IO gateway with rooms partitioned by tournament (`tournament:{id}`) and match (`match:{id}`). Redis adapter for horizontal cluster scaling.
- **`AuditLogsModule` & `NotificationsModule`**: Append-only transactional audit trail and multi-channel notification dispatcher.

---

## 4. Communication & Synchronization Protocols

1. **REST API (`/api/v1/`)**:
   - Strict standard HTTP verbs, version prefixing, idempotency keys for mutable operations (`Idempotency-Key` header).
   - Uniform response envelopes: `{ success: boolean, message: string, data: T, meta?: object }`.
   - Error envelope with typed validation details.
2. **WebSocket / Socket.IO (`/socket.io`)**:
   - Heartbeat ping/pong (25s interval, 20s timeout).
   - Room-based channel subscription: clients subscribe only to relevant match or tournament rooms to prevent broadcast storms.
   - Versioned event envelopes: `{ eventId, type, tournamentId, matchId, version, timestamp, data }`.
   - Snapshot recovery: On socket reconnect, clients issue a REST query for latest match state and reconcile local state using the monotonic version number.

---

## 5. Security & Data Integrity Architecture

1. **Authentication**:
   - Argon2id password hashing.
   - Short-lived Access Tokens (15 mins) and sliding-window Refresh Tokens (7 days) stored in HttpOnly, Secure, SameSite cookies or Bearer Authorization header.
2. **Authorization Guards**:
   - `SystemRoleGuard`: Enforces `SUPER_ADMIN` system permissions.
   - `TournamentRoleGuard`: Verifies user's active assignment in `tournament_staff` table for the target tournament ID.
   - `UmpireMatchGuard`: Verifies that a scoring command originates specifically from the referee assigned to that match or an authorized organizer.
3. **Database Integrity**:
   - ACID transactions (`prisma.$transaction`) wrap all bracket generations, draw locks, match completion promotions, and score operations.
   - Unique composite constraints preventing duplicate athlete registrations in the same event.
   - Check constraints ensuring non-negative score values.

