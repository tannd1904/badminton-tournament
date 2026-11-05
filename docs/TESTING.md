# Testing Strategy & Quality Assurance Plan

## 1. Testing Pyramid Overview

To fulfill the primary directive (**Functional correctness > Architecture quality > User experience > Visual polish**), the testing strategy encompasses four levels of verification:

```text
               ▲
              / \
             /   \      E2E Tests (Playwright)
            /     \     - Full tournament lifecycle flow
           /───────\
          /         \   Integration Tests (Supertest)
         /           \  - API endpoints, RBAC guards, DB transactions
        /─────────────\
       /               \ Unit Tests (Jest)
      /                 \- Tournament Engine (Draw, Seeding, Avoidance)
     /                   \- Scoring Engine (Deuce, 30-pt cap, Rotation, Undo)
    /                     \- Scheduling Engine (Multi-court CSP, Overrun ripple)
   ─────────────────────────
```

---

## 2. Core Unit Test Specifications

### 2.1. Tournament Engine Tests (`tournament-engine.spec.ts`)
- **Knockout Bracket Sizing**:
  - Exact powers of 2 (4, 8, 16, 32).
  - Non-powers of 2 (e.g. 5, 9, 11, 23 teams) correctly distributing calculated Byes.
- **Seeding Hierarchy**:
  - Seed 1 strictly top, Seed 2 strictly bottom.
  - Seeds 3 & 4 distributed in opposing internal quarters.
  - Seeds 5–8 distributed across remaining quarters.
- **Same-Club Avoidance**:
  - Teams sharing the same `club_id` are distributed to opposing halves/quarters whenever mathematically feasible.
  - Graceful fallback and warning issuance when avoidance is constrained.
- **Round-Robin Berger Matrix**:
  - Odd and even participant rotation cycles.
  - Deterministic tie-breaking on points, set difference, and point difference.

### 2.2. Scoring Engine Tests (`scoring-engine.spec.ts`)
- **Target Points & Deuce**:
  - Set concludes at 21–15 (standard win).
  - Set continues at 20–20 (deuce entry).
  - Set continues at 21–20 (1-point margin insufficient).
  - Set concludes at 22–20 (2-point margin achieved).
  - Set continues at 29–29.
  - Set concludes strictly at 30–29 (sudden-death 30-point ceiling).
- **Match Best-of-3**:
  - Match concludes immediately when either side wins 2 sets (2–0 or 2–1).
  - No additional sets permitted once match is `COMPLETED`.
- **Event-Sourced Undo**:
  - Undo reverts score, service position, and winning side atomically.
  - Undo at the start of Set 2 reopens Set 1.
- **Doubles Service Rotation**:
  - Server swaps courts upon winning rally; receiving pair holds courts.
  - Service over transfers serve to correct diagonal court based on current even/odd score.

### 2.3. Scheduling Engine Tests (`scheduling-engine.spec.ts`)
- **No Overlapping Court Allocations**: Ensures no court has overlapping match time intervals.
- **Athlete Rest Buffer**: Confirms minimum rest buffer between matches for the same player.
- **Lock-Time Inviolability**: Verified that dynamic rescheduling ripples around locked matches without altering their fixed start time.

