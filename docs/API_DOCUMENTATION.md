# API & Real-time Specification

## 1. REST API Standards

All endpoints adhere to REST conventions under the `/api/v1` namespace.

### Standard Response Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "registrationCloseAt",
      "message": "Registration close date must precede tournament start date"
    }
  ]
}
```

---

## 2. Core API Endpoints

### 2.1. Authentication (`/api/v1/auth`)
- `POST /register`: Create a new user account.
- `POST /login`: Authenticate and receive Access + Refresh tokens.
- `POST /refresh`: Issue a new Access Token via valid Refresh Token.
- `POST /logout`: Invalidate current session/refresh token.
- `GET  /me`: Fetch authenticated user profile and active tournament memberships.

### 2.2. Tournaments (`/api/v1/tournaments`)
- `GET    /`: List public tournaments (supports filters: `sport`, `status`, `city`, `q`).
- `POST   /`: Create a new tournament draft (`ORGANIZER` assigned automatically).
- `GET    /:id`: Fetch tournament overview, rules, and configuration.
- `PATCH  /:id`: Update tournament parameters (Organizer only).
- `POST   /:id/submit-approval`: Submit draft tournament to Super Admin for moderation.
- `POST   /:id/open-registration`: Open athlete registration window.
- `POST   /:id/close-registration`: Close athlete registration window.
- `POST   /:id/publish-schedule`: Finalize and publish official match schedule.

### 2.3. Events & Registrations (`/api/v1/events`, `/api/v1/registrations`)
- `GET    /tournaments/:id/events`: List all categories/events in a tournament.
- `POST   /tournaments/:id/events`: Add a new event (e.g. Men's Doubles Advanced).
- `GET    /events/:id/registrations`: Get participants and approval queue.
- `POST   /events/:id/registrations`: Register single athlete or pair for an event.
- `PATCH  /registrations/:id/approve`: Approve registration into active draw pool.
- `PATCH  /registrations/:id/reject`: Reject registration with explanation.
- `PATCH  /registrations/:id/check-in`: Court-side check-in confirmation on tournament day.

### 2.4. Tournament Engine & Draw (`/api/v1/events/:id/draw`)
- `POST   /preview`: Execute dry-run of draw generator (seeding + club avoidance); returns candidate bracket layout.
- `POST   /confirm`: Commit bracket structure to database, instantiate first-round matches.
- `GET    /bracket`: Fetch visual tree data for the bracket canvas.
- `PATCH  /manual-swap`: Manually swap two bracket slots prior to match commencement (audited).

### 2.5. Smart Scheduling (`/api/v1/tournaments/:id/schedule`)
- `POST   /generate`: Auto-generate court schedule via CSP algorithm.
- `GET    /`: Retrieve Gantt timeline of all matches mapped to courts and timestamps.
- `PATCH  /matches/:matchId/reassign`: Manually drag-and-drop a match to a new court or time slot.
- `PATCH  /matches/:matchId/lock-time`: Toggle `is_time_locked` on a match.
- `POST   /recalculate`: Recompute schedule ripple following live match overrun.

### 2.6. Match Officiating & Scoring (`/api/v1/matches`)
- `GET    /:id`: Fetch match details, current sets, score snapshot, and assigned referee.
- `PATCH  /:id/status`: Transition status (`READY`, `IN_PROGRESS`, `WALKOVER`).
- `POST   /:id/score/point`: Add point to Team A or Team B (requires `idempotencyKey`).
- `POST   /:id/score/undo`: Atomic undo of the most recent score mutation.
- `POST   /:id/score/swap-sides`: Umpire command to swap court sides on scoreboard.
- `POST   /:id/score/complete`: Finalize match and trigger automatic winner bracket advancement.
- `GET    /:id/score/history`: Retrieve full event-sourced rally timeline.

### 2.7. Referees (`/api/v1/referee`)
- `GET    /assigned-matches`: List matches assigned to current authenticated referee.

### 2.8. Public Portal (`/api/v1/public`)
- `GET /tournaments`: Public listing with full text search and faceted navigation.
- `GET /tournaments/:slug`: Public tournament profile with tabs.
- `GET /tournaments/:slug/bracket`: Public real-time bracket canvas data.
- `GET /tournaments/:slug/schedule`: Public court schedule.
- `GET /tournaments/:slug/standings`: Public group stage standings.
- `GET /matches/live`: Real-time active match ticker across all courts.
- `GET /overlay/:publicToken`: Streamlined live score payload for OBS browser sources.

---

## 3. Real-Time WebSocket Events (Socket.IO)

### 3.1. Room Subscriptions
- `joinTournament(tournamentId)`: Joins room `tournament:{tournamentId}`.
- `leaveTournament(tournamentId)`: Leaves room.
- `joinMatch(matchId)`: Joins room `match:{matchId}`.
- `leaveMatch(matchId)`: Leaves room.

### 3.2. Broadcast Event Schemas

#### Event: `match.score.updated`
```json
{
  "eventId": "evt_b18f0a20-80a3-4b62-9577-4b19c25f483c",
  "type": "match.score.updated",
  "tournamentId": "tourn_c5e8...",
  "matchId": "match_9df2...",
  "version": 18,
  "timestamp": "2026-11-05T01:50:00.000Z",
  "data": {
    "setNumber": 1,
    "scoreTeamA": 19,
    "scoreTeamB": 18,
    "servingTeam": "TEAM_A",
    "courtSideA": "LEFT",
    "courtSideB": "RIGHT"
  }
}
```

#### Event: `match.completed`
```json
{
  "eventId": "evt_d21c...",
  "type": "match.completed",
  "tournamentId": "tourn_c5e8...",
  "matchId": "match_9df2...",
  "version": 25,
  "timestamp": "2026-11-05T02:05:00.000Z",
  "data": {
    "winnerId": "part_88b1...",
    "setsSummary": [
      { "set": 1, "scoreA": 21, "scoreB": 19 },
      { "set": 2, "scoreA": 21, "scoreB": 17 }
    ],
    "nextMatchId": "match_10ab...",
    "nextMatchSlot": "TEAM_A"
  }
}
```

