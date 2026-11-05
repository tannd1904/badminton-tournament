# Smart Scheduling Engine — Technical Specification

## 1. Engine Mission

Badminton tournaments often suffer from court bottlenecks, delayed matches, and athlete exhaustion caused by back-to-back games across multiple events.

The **Smart Scheduling Engine** automates court allocation, ensures mandatory rest intervals, respects court operational hours, strictly enforces **Lock Time** commitments, and dynamically propagates schedule adjustments when live matches run long or finish early.

---

## 2. Mathematical Formulation & Constraints

Let:
- $\mathcal{M} = \{m_1, m_2, \dots, m_N\}$ be the set of matches to schedule.
- $\mathcal{C} = \{c_1, c_2, \dots, c_K\}$ be the available courts.
- $T_{start}(m), T_{end}(m)$ denote the start and end times of match $m$.
- $D(m)$ be the estimated duration (default 35 minutes).
- $I_{rest}$ be the mandatory minimum rest interval between matches for any athlete (default 20–30 minutes).

### 2.1. Hard Constraints (Inviolable)
1. **Court Mutual Exclusion**:
   For any two distinct matches $m_i, m_j$ assigned to the same court $c_k$:
   $$T_{end}(m_i) + \Delta_{court\_prep} \le T_{start}(m_j) \quad \lor \quad T_{end}(m_j) + \Delta_{court\_prep} \le T_{start}(m_i)$$
2. **Athlete Mutual Exclusion & Rest Buffer**:
   If athlete $a$ participates in both $m_i$ and $m_j$:
   $$T_{end}(m_i) + I_{rest} \le T_{start}(m_j) \quad \lor \quad T_{end}(m_j) + I_{rest} \le T_{start}(m_i)$$
3. **Referee Mutual Exclusion**:
   A referee $r$ cannot umpire two overlapping matches:
   $$T_{end}(m_i) \le T_{start}(m_j) \quad \lor \quad T_{end}(m_j) \le T_{start}(m_i)$$
4. **Bracket Precedence (Knockout Dependency)**:
   If match $m_j$ depends on the winner of match $m_i$ ($m_i \to m_j$):
   $$T_{end}(m_i) + I_{rest} \le T_{start}(m_j)$$
5. **Operating Hours**:
   All matches must start and end within court operational windows:
   $$T_{venue\_open} \le T_{start}(m) \quad \text{and} \quad T_{end}(m) \le T_{venue\_close}$$
6. **Time Lock Guarantee**:
   If $m.is\_time\_locked = \text{true}$, then $T_{start}(m) = T_{locked\_fixed}$.

---

## 3. Lock Time & Dynamic Rescheduling Algorithm

### 3.1. The Overrun Scenario
Suppose Court 1 is scheduled as follows:
- 08:00 – 08:35: Match A
- 08:45 – 09:20: Match B
- 09:30 – 10:05: Match C (**LOCKED**)
- 10:15 – 10:50: Match D

Match A runs 25 minutes long and finishes at 09:00 instead of 08:35.

### 3.2. Dynamic Propagation Steps
1. **Identify Impact Subtree**:
   Match B on Court 1 cannot start at 08:45 because Court 1 is occupied until 09:00. Earliest possible start for Match B is 09:05.
2. **Evaluate Locked Boundary**:
   Match B with estimated duration 35 mins would finish at 09:40. However, Match C is **LOCKED** at 09:30.
   Starting Match B at 09:05 would violate Court Mutual Exclusion with Match C (09:40 > 09:30).
3. **Smart Conflict Resolution Options**:
   - **Option A (Reassignment)**: Query courts $c_2 \dots c_K$ for an idle window capable of accommodating Match B without violating athlete rest constraints.
   - **Option B (Push Unlocked Matches)**: Shift Match B to after Match C (e.g. 10:15) and ripple subsequent unlocked matches (Match D) forward.
   - **Option C (Manual Flagging)**: If no automatic solution exists without violating constraints, generate a high-priority `SCHEDULE_CONFLICT_DETECTED` alert for the tournament organizer, highlighting the affected court and matches.
4. **Batch Preview & Apply**:
   Proposed schedule recalculations are returned to the organizer dashboard in a "Proposed Changes Diff" modal. Once confirmed, changes are committed in a single transaction and broadcast to athletes via WebSockets and SMS/In-App notifications.

