# Badminton Scoring Rules & Match Engine Specification

## 1. Official BWF Rally-Point Rules Implementation

Every badminton match follows the standard BWF Rally Point System:
1. **Best of 3 Sets**: The first team to win 2 sets wins the match.
2. **21-Point Target**: A set is won by the first side to reach 21 points, provided they hold at least a 2-point margin (e.g. 21–19, 21–15).
3. **Deuce Extension (Beyond 20–20)**:
   - If the score reaches 20–20, play continues until one side achieves a 2-point lead (e.g. 22–20, 24–22).
4. **Sudden-Death Cap (30 Points)**:
   - If the score reaches 29–29, the side scoring the 30th point wins the set (30–29). 30 points is the strict maximum.
5. **Deciding 3rd Set Interval**:
   - In the 3rd set, players swap ends when either side first reaches 11 points.

---

## 2. Service & Court Position State Machine

### 2.1. Singles Service Rules
- Score is **Even** (0, 2, 4, ...): Server serves from the **Right service court** into the diagonal right receiving court.
- Score is **Odd** (1, 3, 5, ...): Server serves from the **Left service court** into the diagonal left receiving court.

### 2.2. Doubles Service & Rotation Logic
In doubles, each pair consists of Player 1 and Player 2 stationed on Left Court and Right Court:
1. **Initial State (0–0)**:
   - Team A chosen as initial server; Team B initial receiver.
   - Initial Server stands on Right Court; Initial Receiver stands on diagonal Right Court.
2. **Serving Side Wins the Rally**:
   - Serving side earns +1 point.
   - The *same server* alternates service courts (switches from Right to Left, or Left to Right).
   - The receiving side does NOT switch courts.
3. **Receiving Side Wins the Rally**:
   - Receiving side earns +1 point and becomes the new serving side ("Service Over").
   - Neither side changes their existing court positions.
   - The player on the receiving side who serves is determined by their new score:
     - If their new score is **Even**, the player standing in their **Right court** serves.
     - If their new score is **Odd**, the player standing in their **Left court** serves.

---

## 3. Score Actions & State Transitions

```text
               ┌───────────────────────┐
               │       SCHEDULED       │
               └───────────┬───────────┘
                           │ Umpire Calls Match (Ready)
               ┌───────────▼───────────┐
               │         READY         │
               └───────────┬───────────┘
                           │ Coin Toss & 1st Serve Selected
               ┌───────────▼───────────┐
      ┌───────►│      IN_PROGRESS      │◄───────┐
      │        └───────────┬───────────┘        │
Point Added                │ Set Finished       │
      │        ┌───────────▼───────────┐        │
      └────────┤       SET 1 WON       ├────────┘
               └───────────┬───────────┘
                           │ Team Wins 2nd Set
               ┌───────────▼───────────┐
               │       COMPLETED       │
               └───────────────────────┘
```

---

## 4. Event-Sourced Undo Mechanism

To ensure zero score discrepancies and instantaneous correction when umpires mis-tap:
1. Every score mutation generates an immutable record in `match_score_events`:
   - `id`: Unique UUID
   - `match_id`: Foreign key
   - `set_number`: Active set
   - `event_type`: `POINT_ADDED` | `POINT_REMOVED` | `SWAP_SIDES`
   - `team`: `'TEAM_A'` | `'TEAM_B'`
   - `score_team_a`, `score_team_b`: Post-event score snapshot
   - `serving_team`: Team with service
   - `idempotency_key`: Client-generated UUID preventing duplicate clicks
2. **Undo Action (`POST /matches/:id/score/undo`)**:
   - Within an atomic database transaction (`prisma.$transaction`), find the latest event for `match_id`.
   - Revert the `match_sets` scores and server assignment to the preceding snapshot.
   - If the previous event had triggered `SET_COMPLETED` and opened Set 2 or Set 3, the active set is reopened and returned to `IN_PROGRESS`.
   - An event of type `POINT_REMOVED` is appended to the audit log.
   - The updated snapshot with incremented `match.version` is broadcast over WebSocket to all subscribers.

---

## 5. Match Completion & Bracket Advancement

When the final point of Set 2 (if 2–0) or Set 3 (if 2–1) is verified by the backend:
1. `matches.status` transitions to `COMPLETED`.
2. `matches.actual_end_time` is recorded.
3. `matches.winner_id` is set to the winning `participant_id`.
4. If `matches.next_match_id` exists:
   - Identify `next_match_slot` (`'TEAM_A'` or `'TEAM_B'`).
   - Atomically assign `matches.winner_id` to `next_match.team_a_id` or `next_match.team_b_id`.
   - If both `team_a_id` and `team_b_id` are now populated in the next match, set its status from `WAITING_FOR_PLAYERS` to `SCHEDULED`.
5. WebSocket event `match.completed` and `bracket.updated` are pushed immediately.

