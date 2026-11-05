# Business Rules & Tournament Regulations

## 1. Athlete & Registration Constraints

1. **Category Eligibility**:
   - An athlete can only register for events matching their sex (Men's / Women's) unless participating in Mixed Doubles.
   - In doubles events, both players must be registered; partner pairing requires invitation acceptance if partner verification is active.
2. **Registration Limits**:
   - An athlete cannot register for more events than defined by `tournaments.max_events_per_player` (standard: 2 events per athlete).
   - An athlete cannot register twice in the same event with different partners.
3. **Registration State Transitions**:
   - `PENDING` -> `APPROVED` (Organizer approval or auto-approval upon fee confirmation).
   - `PENDING` -> `REJECTED` (with mandatory rejection reason).
   - `APPROVED` -> `CHECKED_IN` (Court-side confirmation on day of event).
   - `APPROVED` -> `WITHDRAWN` (Permitted only before draw generation).

---

## 2. Tournament Lifecycle State Machine

1. **`DRAFT`**: Initial setup, private to creator.
2. **`PENDING_APPROVAL`**: Submitted to Super Admin for platform compliance verification.
3. **`REGISTRATION_OPEN`**: Publicly discoverable; athletes can submit registrations.
4. **`REGISTRATION_CLOSED`**: Registration deadline reached; roster locked for draw.
5. **`DRAW_COMPLETED`**: Brackets and round-robin groups generated and confirmed by organizer.
6. **`SCHEDULE_PUBLISHED`**: Court assignments and scheduled match times made public.
7. **`IN_PROGRESS`**: Matches underway; live scores broadcast.
8. **`COMPLETED`**: All final matches concluded and champions crowned.
9. **`SUSPENDED` / `CANCELLED`**: Administrative intervention states.

---

## 3. Match Progression & Walkovers

1. **Walkover Rule (W.O.)**:
   - If an athlete/pair fails to appear on court within 10 minutes of official match call, the umpire or organizer records a `WALKOVER`.
   - The opposing side is declared the winner with sets recorded as 21–0, 21–0.
2. **Retirement / Injury**:
   - If a player retires during a set (e.g. at 14–12), the current set and remaining sets are awarded to the opponent.

