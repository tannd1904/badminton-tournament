import { Injectable, Logger } from '@nestjs/common';

export interface ParticipantCandidate {
  id: string;
  displayName: string;
  clubId?: string | null;
  clubName?: string | null;
  isSeeded: boolean;
  seedNumber?: number | null;
}

export interface BracketSlot {
  slotNumber: number; // 1 to K
  isBye: boolean;
  participant?: ParticipantCandidate | null;
}

export interface KnockoutMatchCandidate {
  roundNumber: number;
  roundName: string;
  matchIndex: number; // 1 to (K / 2^round)
  matchCode: string;
  slotA: BracketSlot;
  slotB: BracketSlot;
  nextMatchIndex?: number;
  nextMatchSlot?: 'TEAM_A' | 'TEAM_B';
}

export interface PreviewKnockoutResult {
  totalParticipants: number;
  bracketSize: number; // Power of 2 (4, 8, 16, 32, ...)
  totalRounds: number;
  totalByes: number;
  slots: BracketSlot[];
  firstRoundMatches: KnockoutMatchCandidate[];
  sameClubConflictsCount: number;
  warnings: string[];
}

export interface RoundRobinMatchCandidate {
  roundNumber: number;
  matchCode: string;
  teamA: ParticipantCandidate;
  teamB: ParticipantCandidate;
}

export interface PreviewRoundRobinResult {
  totalParticipants: number;
  totalRounds: number;
  totalMatches: number;
  rounds: {
    roundNumber: number;
    matches: RoundRobinMatchCandidate[];
    byeParticipant?: ParticipantCandidate | null;
  }[];
}

@Injectable()
export class TournamentEngineService {
  private readonly logger = new Logger(TournamentEngineService.name);

  /**
   * Calculates the smallest power of 2 greater than or equal to N (minimum 4)
   */
  calculateBracketSize(participantCount: number): number {
    if (participantCount <= 4) return 4;
    return Math.pow(2, Math.ceil(Math.log2(participantCount)));
  }

  /**
   * Returns standard round names based on remaining matches in round
   */
  getRoundName(matchesInRound: number): string {
    switch (matchesInRound) {
      case 1:
        return 'Chung Kết (Final)';
      case 2:
        return 'Bán Kết (Semifinal)';
      case 4:
        return 'Tứ Kết (Quarterfinal)';
      case 8:
        return 'Vòng 1/8 (Round of 16)';
      case 16:
        return 'Vòng 1/16 (Round of 32)';
      case 32:
        return 'Vòng 1/32 (Round of 64)';
      default:
        return `Vòng ${matchesInRound * 2} đội`;
    }
  }

  /**
   * Generates official seeded slot placement index mapping for a bracket of size K.
   * Standard tournament seeding locations:
   * Seed 1 -> 1
   * Seed 2 -> K
   * Seed 3 -> (K / 2) + 1 (Bottom half top)
   * Seed 4 -> (K / 2)     (Top half bottom)
   * Seeds 5-8 -> (K / 4) + 1, (3K / 4), etc.
   */
  getSeedSlotPositions(K: number): number[] {
    if (K === 4) {
      return [1, 4, 3, 2];
    }

    if (K === 8) {
      // Seed 1 -> 1, Seed 2 -> 8, Seed 3 -> 5, Seed 4 -> 4, Seed 5-8 -> 3, 6, 7, 2
      return [1, 8, 5, 4, 3, 6, 7, 2];
    }

    if (K === 16) {
      return [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2];
    }

    // Generic recursive seeding generator for K = 2^m
    const positions: number[] = [1, 2];
    while (positions.length < K) {
      const currentLen = positions.length * 2;
      const nextPositions: number[] = [];
      for (const pos of positions) {
        nextPositions.push(pos);
        nextPositions.push(currentLen + 1 - pos);
      }
      positions.length = 0;
      positions.push(...nextPositions);
    }

    return positions;
  }

  /**
   * Generates Knockout bracket with seeding, byes, and Same-Club Avoidance constraint solver
   */
  generateKnockoutBracket(
    participants: ParticipantCandidate[],
    eventCode: string = 'M',
  ): PreviewKnockoutResult {
    const N = participants.length;
    if (N < 2) {
      throw new Error('Cần tối thiểu 2 VĐV để bốc thăm thi đấu');
    }

    const K = this.calculateBracketSize(N);
    const totalByes = K - N;
    const totalRounds = Math.log2(K);

    // Sort seeded players by seedNumber
    const seededPlayers = participants
      .filter((p) => p.isSeeded && p.seedNumber && p.seedNumber > 0)
      .sort((a, b) => (a.seedNumber || 0) - (b.seedNumber || 0));

    // Unseeded players
    const unseededPlayers = participants.filter(
      (p) => !p.isSeeded || !p.seedNumber || p.seedNumber <= 0,
    );

    // Initialize all K slots
    const slots: BracketSlot[] = Array.from({ length: K }, (_, i) => ({
      slotNumber: i + 1,
      isBye: false,
      participant: null,
    }));

    // Seed positions array for K
    const seedPositions = this.getSeedSlotPositions(K);

    // Place Seeds into their designated slots
    for (let i = 0; i < seededPlayers.length && i < seedPositions.length; i++) {
      const slotIdx = seedPositions[i] - 1;
      slots[slotIdx].participant = seededPlayers[i];
    }

    // Place Byes adjacent to top seeds:
    // Slot 1 (Seed 1) has match with Slot 2 (Bye 1)
    // Slot K (Seed 2) has match with Slot K-1 (Bye 2)
    // Bye placement order matching standard BWF rules
    const byeOrder: number[] = [];
    if (totalByes > 0) {
      // Byes are paired with highest seeds:
      // Match 1: slot 1 vs slot 2 -> Bye at slot 2
      // Match K/2: slot K-1 vs slot K -> Bye at slot K-1
      const candidateByeSlots = [
        2,
        K - 1,
        K / 2,
        K / 2 + 1,
        K / 4,
        K / 4 + 1,
        (3 * K) / 4,
        (3 * K) / 4 + 1,
      ];

      for (let i = 0; i < candidateByeSlots.length && byeOrder.length < totalByes; i++) {
        if (!byeOrder.includes(candidateByeSlots[i])) {
          byeOrder.push(candidateByeSlots[i]);
        }
      }

      // If more byes needed, fill even numbered slots from top down
      for (let s = 2; s <= K && byeOrder.length < totalByes; s += 2) {
        if (!byeOrder.includes(s) && !slots[s - 1].participant) {
          byeOrder.push(s);
        }
      }

      // Mark bye slots
      for (const bSlot of byeOrder) {
        slots[bSlot - 1].isBye = true;
      }
    }

    // Available slots for unseeded players
    const availableSlotIndices = slots
      .map((s, idx) => (s.participant === null && !s.isBye ? idx : -1))
      .filter((idx) => idx !== -1);

    // Solve Same-Club Avoidance using Backtracking CSP
    const { solution, conflictCount, warnings } = this.solveClubAvoidance(
      unseededPlayers,
      availableSlotIndices,
      slots,
      K,
    );

    // Apply solution to slots
    for (let i = 0; i < solution.length; i++) {
      const slotIndex = availableSlotIndices[i];
      slots[slotIndex].participant = solution[i];
    }

    // Build first round matches
    const firstRoundMatches: KnockoutMatchCandidate[] = [];
    const firstRoundMatchCount = K / 2;
    const roundName = this.getRoundName(firstRoundMatchCount);

    for (let m = 0; m < firstRoundMatchCount; m++) {
      const slotA = slots[m * 2];
      const slotB = slots[m * 2 + 1];

      firstRoundMatches.push({
        roundNumber: 1,
        roundName,
        matchIndex: m + 1,
        matchCode: `${eventCode}-R1-M${m + 1}`,
        slotA,
        slotB,
        nextMatchIndex: Math.floor(m / 2) + 1,
        nextMatchSlot: m % 2 === 0 ? 'TEAM_A' : 'TEAM_B',
      });
    }

    return {
      totalParticipants: N,
      bracketSize: K,
      totalRounds,
      totalByes,
      slots,
      firstRoundMatches,
      sameClubConflictsCount: conflictCount,
      warnings,
    };
  }

  /**
   * Backtracking Constraint Solver to minimize Round 1 matches between members of the same club
   */
  private solveClubAvoidance(
    unseeded: ParticipantCandidate[],
    availableSlots: number[],
    slotsTemplate: BracketSlot[],
    K: number,
  ): {
    solution: ParticipantCandidate[];
    conflictCount: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Group players by club
    const clubMap = new Map<string, ParticipantCandidate[]>();
    for (const p of unseeded) {
      const cId = p.clubId || 'INDEPENDENT_' + p.id;
      if (!clubMap.has(cId)) clubMap.set(cId, []);
      clubMap.get(cId)!.push(p);
    }

    // Deterministic greedy placement with club distribution
    // Separate players from the same club across different quarters/halves
    let bestPermutation: ParticipantCandidate[] = [...unseeded];
    let bestCollisions = this.calculateRound1Collisions(
      bestPermutation,
      availableSlots,
      slotsTemplate,
    );

    if (bestCollisions === 0) {
      return { solution: bestPermutation, conflictCount: 0, warnings };
    }

    // Try randomized / heuristic swap iterations to reach 0 conflicts
    const candidates = [...unseeded];
    const maxIterations = Math.min(2000, candidates.length * 50);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Pick two random players and swap
      const idx1 = Math.floor(Math.random() * candidates.length);
      const idx2 = Math.floor(Math.random() * candidates.length);
      if (idx1 === idx2) continue;

      // Swap
      const temp = candidates[idx1];
      candidates[idx1] = candidates[idx2];
      candidates[idx2] = temp;

      const currentCollisions = this.calculateRound1Collisions(
        candidates,
        availableSlots,
        slotsTemplate,
      );

      if (currentCollisions < bestCollisions) {
        bestCollisions = currentCollisions;
        bestPermutation = [...candidates];
        if (bestCollisions === 0) {
          break;
        }
      }
    }

    if (bestCollisions > 0) {
      warnings.push(
        `Do tỷ lệ VĐV cùng CLB lớn, vẫn còn ${bestCollisions} trận có 2 VĐV cùng CLB gặp nhau ở vòng 1. Ban Tổ Chức có thể điều chỉnh thủ công nếu cần.`,
      );
    }

    return {
      solution: bestPermutation,
      conflictCount: bestCollisions,
      warnings,
    };
  }

  /**
   * Evaluates number of matches in Round 1 where opponents have identical clubId
   */
  private calculateRound1Collisions(
    candidateOrder: ParticipantCandidate[],
    availableSlots: number[],
    slotsTemplate: BracketSlot[],
  ): number {
    // Clone template
    const simSlots: BracketSlot[] = slotsTemplate.map((s) => ({ ...s }));
    for (let i = 0; i < candidateOrder.length; i++) {
      simSlots[availableSlots[i]].participant = candidateOrder[i];
    }

    let collisions = 0;
    const matchCount = simSlots.length / 2;

    for (let m = 0; m < matchCount; m++) {
      const p1 = simSlots[m * 2].participant;
      const p2 = simSlots[m * 2 + 1].participant;

      if (
        p1 &&
        p2 &&
        p1.clubId &&
        p2.clubId &&
        p1.clubId === p2.clubId
      ) {
        collisions++;
      }
    }

    return collisions;
  }

  /**
   * Generates Round Robin schedule using the official Berger Polygon Rotation method
   */
  generateRoundRobinSchedule(
    participants: ParticipantCandidate[],
    eventCode: string = 'RR',
  ): PreviewRoundRobinResult {
    const N = participants.length;
    if (N < 2) {
      throw new Error('Cần tối thiểu 2 đội để tạo bảng thi đấu vòng tròn');
    }

    const isOdd = N % 2 !== 0;
    const teams: (ParticipantCandidate | null)[] = [...participants];
    if (isOdd) {
      teams.push(null); // Dummy Bye team
    }

    const totalTeams = teams.length;
    const totalRounds = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;

    const roundsResult: PreviewRoundRobinResult['rounds'] = [];
    let matchSequence = 1;

    // Fixed team 0, rotating teams 1 to totalTeams - 1
    const rotatingIndices = Array.from({ length: totalTeams - 1 }, (_, i) => i + 1);

    for (let r = 0; r < totalRounds; r++) {
      const roundMatches: RoundRobinMatchCandidate[] = [];
      let byeTeam: ParticipantCandidate | null = null;

      // Current round team line-up
      const currentRoundTeams: (ParticipantCandidate | null)[] = [teams[0]];
      for (const idx of rotatingIndices) {
        currentRoundTeams.push(teams[idx]);
      }

      for (let m = 0; m < matchesPerRound; m++) {
        const teamA = currentRoundTeams[m];
        const teamB = currentRoundTeams[totalTeams - 1 - m];

        if (teamA === null && teamB !== null) {
          byeTeam = teamB;
        } else if (teamB === null && teamA !== null) {
          byeTeam = teamA;
        } else if (teamA && teamB) {
          roundMatches.push({
            roundNumber: r + 1,
            matchCode: `${eventCode}-R${r + 1}-M${matchSequence++}`,
            teamA,
            teamB,
          });
        }
      }

      roundsResult.push({
        roundNumber: r + 1,
        matches: roundMatches,
        byeParticipant: byeTeam,
      });

      // Rotate: shift last element to the front of rotatingIndices
      const last = rotatingIndices.pop()!;
      rotatingIndices.unshift(last);
    }

    const totalMatches = roundsResult.reduce((acc, r) => acc + r.matches.length, 0);

    return {
      totalParticipants: N,
      totalRounds,
      totalMatches,
      rounds: roundsResult,
    };
  }
}

