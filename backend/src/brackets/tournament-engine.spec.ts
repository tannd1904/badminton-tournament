import { Test, TestingModule } from '@nestjs/testing';
import {
  TournamentEngineService,
  ParticipantCandidate,
} from './tournament-engine.service';

describe('TournamentEngineService', () => {
  let service: TournamentEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TournamentEngineService],
    }).compile();

    service = module.get<TournamentEngineService>(TournamentEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateBracketSize', () => {
    it('should return 4 for 2, 3, 4 participants', () => {
      expect(service.calculateBracketSize(2)).toBe(4);
      expect(service.calculateBracketSize(3)).toBe(4);
      expect(service.calculateBracketSize(4)).toBe(4);
    });

    it('should return 8 for 5, 6, 7, 8 participants', () => {
      expect(service.calculateBracketSize(5)).toBe(8);
      expect(service.calculateBracketSize(7)).toBe(8);
      expect(service.calculateBracketSize(8)).toBe(8);
    });

    it('should return 16 for 9 to 16 participants', () => {
      expect(service.calculateBracketSize(9)).toBe(16);
      expect(service.calculateBracketSize(11)).toBe(16);
      expect(service.calculateBracketSize(16)).toBe(16);
    });

    it('should return 32 for 17 to 32 participants', () => {
      expect(service.calculateBracketSize(17)).toBe(32);
      expect(service.calculateBracketSize(32)).toBe(32);
    });
  });

  describe('generateKnockoutBracket', () => {
    it('should generate 8-slot bracket for 8 participants with correct seeds', () => {
      const participants: ParticipantCandidate[] = [
        { id: 'p1', displayName: 'Seed 1 Player', isSeeded: true, seedNumber: 1, clubId: 'c1' },
        { id: 'p2', displayName: 'Seed 2 Player', isSeeded: true, seedNumber: 2, clubId: 'c2' },
        { id: 'p3', displayName: 'Seed 3 Player', isSeeded: true, seedNumber: 3, clubId: 'c3' },
        { id: 'p4', displayName: 'Seed 4 Player', isSeeded: true, seedNumber: 4, clubId: 'c4' },
        { id: 'p5', displayName: 'Player 5', isSeeded: false, clubId: 'c5' },
        { id: 'p6', displayName: 'Player 6', isSeeded: false, clubId: 'c6' },
        { id: 'p7', displayName: 'Player 7', isSeeded: false, clubId: 'c7' },
        { id: 'p8', displayName: 'Player 8', isSeeded: false, clubId: 'c8' },
      ];

      const res = service.generateKnockoutBracket(participants, 'MS');

      expect(res.bracketSize).toBe(8);
      expect(res.totalByes).toBe(0);
      expect(res.totalRounds).toBe(3);
      expect(res.firstRoundMatches.length).toBe(4);

      // Seed 1 is in Slot 1
      expect(res.slots[0].participant?.id).toBe('p1');
      // Seed 2 is in Slot 8
      expect(res.slots[7].participant?.id).toBe('p2');
    });

    it('should generate 16-slot bracket for 11 participants with 5 byes paired to top seeds', () => {
      const participants: ParticipantCandidate[] = Array.from({ length: 11 }, (_, i) => ({
        id: `p${i + 1}`,
        displayName: `Player ${i + 1}`,
        isSeeded: i < 4,
        seedNumber: i < 4 ? i + 1 : undefined,
        clubId: `club_${i % 4}`,
      }));

      const res = service.generateKnockoutBracket(participants, 'MD');

      expect(res.bracketSize).toBe(16);
      expect(res.totalByes).toBe(5);
      expect(res.totalRounds).toBe(4);
      expect(res.firstRoundMatches.length).toBe(8);

      // Seed 1 (Slot 1) opponent is Bye (Slot 2)
      expect(res.slots[0].participant?.id).toBe('p1');
      expect(res.slots[1].isBye).toBe(true);

      // Seed 2 (Slot 16) opponent is Bye (Slot 15)
      expect(res.slots[15].participant?.id).toBe('p2');
      expect(res.slots[14].isBye).toBe(true);
    });

    it('should minimize same-club conflicts in round 1', () => {
      // 8 participants: 4 from Club A, 4 from Club B
      const participants: ParticipantCandidate[] = [
        { id: 'p1', displayName: 'Player A1', isSeeded: false, clubId: 'CLUB_A' },
        { id: 'p2', displayName: 'Player A2', isSeeded: false, clubId: 'CLUB_A' },
        { id: 'p3', displayName: 'Player A3', isSeeded: false, clubId: 'CLUB_A' },
        { id: 'p4', displayName: 'Player A4', isSeeded: false, clubId: 'CLUB_A' },
        { id: 'p5', displayName: 'Player B1', isSeeded: false, clubId: 'CLUB_B' },
        { id: 'p6', displayName: 'Player B2', isSeeded: false, clubId: 'CLUB_B' },
        { id: 'p7', displayName: 'Player B3', isSeeded: false, clubId: 'CLUB_B' },
        { id: 'p8', displayName: 'Player B4', isSeeded: false, clubId: 'CLUB_B' },
      ];

      const res = service.generateKnockoutBracket(participants, 'WS');

      // 4 Club A vs 4 Club B in 4 matches can achieve 0 collisions in Round 1
      expect(res.sameClubConflictsCount).toBe(0);

      // Check each first-round match has different club opponents
      for (const m of res.firstRoundMatches) {
        if (m.slotA.participant?.clubId && m.slotB.participant?.clubId) {
          expect(m.slotA.participant.clubId).not.toBe(m.slotB.participant.clubId);
        }
      }
    });
  });

  describe('generateRoundRobinSchedule (Berger Polygon Rotation)', () => {
    it('should generate round robin for 4 teams: 3 rounds, 6 matches', () => {
      const participants: ParticipantCandidate[] = [
        { id: 't1', displayName: 'Team 1', isSeeded: false },
        { id: 't2', displayName: 'Team 2', isSeeded: false },
        { id: 't3', displayName: 'Team 3', isSeeded: false },
        { id: 't4', displayName: 'Team 4', isSeeded: false },
      ];

      const res = service.generateRoundRobinSchedule(participants, 'GRP-A');

      expect(res.totalParticipants).toBe(4);
      expect(res.totalRounds).toBe(3);
      expect(res.totalMatches).toBe(6);
      expect(res.rounds.length).toBe(3);

      for (const round of res.rounds) {
        expect(round.matches.length).toBe(2);
        expect(round.byeParticipant).toBeNull();
      }
    });

    it('should generate round robin for 5 teams (odd): 5 rounds, 10 matches with 1 bye per round', () => {
      const participants: ParticipantCandidate[] = [
        { id: 't1', displayName: 'Team 1', isSeeded: false },
        { id: 't2', displayName: 'Team 2', isSeeded: false },
        { id: 't3', displayName: 'Team 3', isSeeded: false },
        { id: 't4', displayName: 'Team 4', isSeeded: false },
        { id: 't5', displayName: 'Team 5', isSeeded: false },
      ];

      const res = service.generateRoundRobinSchedule(participants, 'GRP-B');

      expect(res.totalParticipants).toBe(5);
      expect(res.totalRounds).toBe(5);
      expect(res.totalMatches).toBe(10); // C(5, 2) = 10 matches
      expect(res.rounds.length).toBe(5);

      // Each round has exactly 2 matches and 1 bye team
      const byeTeams = new Set<string>();
      for (const round of res.rounds) {
        expect(round.matches.length).toBe(2);
        expect(round.byeParticipant).toBeDefined();
        if (round.byeParticipant) {
          byeTeams.add(round.byeParticipant.id);
        }
      }
      // Each team gets exactly 1 bye across the 5 rounds
      expect(byeTeams.size).toBe(5);
    });
  });
});

