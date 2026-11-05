# Authorization & Role-Based Access Control (RBAC)

## 1. Dual-Level RBAC Model

To support real-world tournament ecosystems where a user can act as an **Athlete** in Tournament A, an **Organizer** in Tournament B, and a certified **Umpire** in Tournament C, permissions are segmented into two distinct layers:

```
┌────────────────────────────────────────────────────────┐
│                   SYSTEM-LEVEL ROLES                   │
│   SUPER_ADMIN                       USER               │
└──────────────────────────────────────┬─────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        │                                                             │
┌───────▼────────────────────────┐           ┌────────────────────────▼───────┐
│     TOURNAMENT A (Organizer)    │           │     TOURNAMENT B (Referee)     │
│ - Manage Events                │           │ - Score Assigned Matches       │
│ - Approve Registrations        │           │ - Swap Court Sides             │
│ - Run Draws & Schedulers       │           │ - Call Sets & End Match        │
└────────────────────────────────┘           └────────────────────────────────┘
```

---

## 2. Role Definitions

### 2.1. System-Level Roles (`users.role`)
- **`SUPER_ADMIN`**: Global governance. Inspects platform telemetry, approves/suspends tournaments, manages system configuration, resolves user disputes.
- **`USER`**: Base system citizen. Can register for events, create clubs, host new tournaments (becoming an Organizer of that tournament), or be invited as staff.

### 2.2. Tournament-Level Roles (`tournament_staff.role`)
- **`ORGANIZER`**: Has full administrative authority within the specific tournament:
  - Configure events, fees, courts.
  - Review, approve, or reject registrations.
  - Run seeding, draw generation, and manual draw overrides.
  - Generate and publish schedules.
  - Reassign referees or courts.
  - Issue announcements and handle disputes.
- **`REFEREE`**: Delegated authority for court-side match officiating:
  - Only permitted to access and control matches where `matches.referee_user_id == current_user.id`.
  - Can transition match status (`READY`, `IN_PROGRESS`, `COMPLETED`).
  - Submit score events and trigger undo operations.
  - Cannot alter event rules, bracket layouts, or schedule locks.

---

## 3. NestJS Guard Architecture

```text
Request Pipeline:
  HTTP Request 
       │
       ▼
  [ JwtAuthGuard ]              -> Validates JWT signature and loads request.user
       │
       ▼
  [ SystemRolesGuard ]          -> Checks @Roles('SUPER_ADMIN') for platform endpoints
       │
       ▼
  [ TournamentStaffGuard ]      -> Verifies request.user has 'ORGANIZER' in tournament_staff
       │
       ▼
  [ UmpireMatchGuard ]          -> Validates referee assignment on match score endpoints
       │
       ▼
  Controller Action
```

---

## 4. Resource Ownership Policies

1. **Self-Registration Modification**: Athletes can only edit or withdraw their own pending registrations (`registrations.submitted_by == request.user.id`).
2. **Double Partner Approval**: In doubles events, both players must consent before a registration transitions to `APPROVED` if partner verification is enabled.
3. **Scoreboard Integrity**: Score submissions are verified against the active umpire assigned to the court. If an organizer overrides a score, it is tagged with `created_by: organizer_user_id` and logged in `audit_logs` with the reason.

