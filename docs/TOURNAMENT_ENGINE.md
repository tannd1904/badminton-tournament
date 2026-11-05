# Tournament Engine — Technical Specification & Algorithms

## 1. Engine Objectives

The Tournament Engine is responsible for:
1. Translating validated participants into official tournament structures (Knockout Brackets or Round-Robin Groups).
2. Implementing official tournament seeding rules (Seeds 1, 2, 3/4, 5/8 placed into opposing halves, quarters, and eighths).
3. Enforcing the **Same-Club Avoidance Constraint** to minimize early intra-club matches in initial rounds without compromising seed hierarchy.
4. Generating Round-Robin tables using the Berger Polygon Rotation method.
5. Evaluating multi-attribute Tie-Breaker rankings (BWF style) and transitioning qualifying teams from Group Stages into final Knockout Brackets.

---

## 2. Knockout Bracket Generation Algorithm

### 2.1. Bracket Sizing & Byes
Given $N$ approved participants:
1. Compute bracket capacity $K = 2^{\lceil \log_2 N \rceil}$ (e.g. For $N=11$, $K=16$).
2. Total Byes $B = K - N$ (For $N=11$, $B=5$).
3. First Round matches = $N - B = 2(N - K/2)$.
4. Bye recipients advance directly to Round 2 without playing Round 1.

### 2.2. Seeding Distribution Pattern
In a standard $K$-slot bracket (indices $1 \dots K$):
- **Seed 1**: Position $1$ (Top half, top slot).
- **Seed 2**: Position $K$ (Bottom half, bottom slot).
- **Seeds 3 & 4**: Randomly or deterministically assigned between Position $K/2$ (Top half lower end) and Position $(K/2) + 1$ (Bottom half upper end).
- **Seeds 5 to 8**: Assigned to remaining quarter divisions: Positions $K/4$, $(K/4)+1$, $(3K/4)$, $(3K/4)+1$.
- Byes are allocated strictly to top seeds first: Bye 1 assigned to Seed 1's opponent slot, Bye 2 assigned to Seed 2's opponent slot, etc.

```text
Bracket Slot Structure (16-draw example):
Slot 1:  Seed 1 (Bye -> Round 2)
Slot 2:  [BYE]
Slot 3:  Unseeded Player A
Slot 4:  Unseeded Player B
Slot 5:  Seed 4
Slot 6:  Unseeded Player C
Slot 7:  Unseeded Player D
Slot 8:  Seed 5
-------------------------------- Half Line
Slot 9:  Seed 6
Slot 10: Unseeded Player E
Slot 11: Unseeded Player F
Slot 12: Seed 3
Slot 13: Unseeded Player G
Slot 14: Unseeded Player H
Slot 15: [BYE]
Slot 16: Seed 2 (Bye -> Round 2)
```

---

## 3. Same-Club Avoidance Algorithm (Backtracking with Penalty Matrix)

When placing unseeded participants into open bracket slots or round-robin groups:
1. Group participants by `club_id`.
2. Construct a conflict graph where an edge represents same club membership.
3. Formulate slot placement as a Constraint Satisfaction Problem (CSP):
   - **Hard Rule**: Seeded slots and Bye locations cannot be altered.
   - **Soft Cost Function**:
     $$C = \sum_{r=1}^{\log_2 K} w_r \cdot M_r$$
     where $M_r$ is the count of matches in round $r$ where both opponents belong to the same club, and $w_r = 10^{\log_2 K - r}$ (heavily penalizing Round 1 clashes).
4. Run backtracking search with branch-and-bound pruning to find the permutation minimizing $C$. If zero cost is unattainable (e.g. 5 out of 8 players belong to Club X), the engine outputs the globally optimal layout and logs an explicit warning for the tournament director.

---

## 4. Round-Robin Generation (Berger Tables / Polygon Method)

For a group of $P$ participants:
1. If $P$ is odd, add a dummy "BYE" participant, setting $P' = P + 1$.
2. Total rounds = $P' - 1$. Each round has $P'/2$ matches.
3. Fix participant 1 at position 0. Rotate remaining participants $2 \dots P'$ cyclically around the table:

```text
Round 1:      Round 2:      Round 3:
1 vs 6        1 vs 5        1 vs 4
2 vs 5        6 vs 4        5 vs 3
3 vs 4        2 vs 3        6 vs 2
```

4. Any participant paired against the dummy "BYE" receives a bye for that round.

---

## 5. Group Stage Tie-Breaking & Standings Engine

Standings are computed according to official BWF General Competition Regulations:
1. **Match Points**: 2 points for match win, 0 for loss (or configurable via `events.win_points`).
2. If two teams are tied:
   - **Head-to-head** match winner takes priority.
3. If three or more teams are tied:
   - **Set Difference** in matches between tied teams: $(\text{Sets Won} - \text{Sets Lost})$.
   - **Point Difference** in matches between tied teams: $(\text{Points Won} - \text{Points Lost})$.
   - **Overall Set Difference** in all group matches.
   - **Overall Point Difference** in all group matches.
   - Random draw / coin toss if all criteria are equal.

---

## 6. Progression to Knockout (Round-Robin Then Knockout)

When an event transitions from Group Stage to Knockout:
1. Top $M$ teams from each group qualify (e.g. Winner and Runner-up).
2. Group Winners are seeded into opposite halves of the knockout bracket to prevent them from meeting until the Final.
3. Runners-up are placed into halves opposite to their own group winner to guarantee that two teams from the same preliminary group cannot play each other before the Final.

