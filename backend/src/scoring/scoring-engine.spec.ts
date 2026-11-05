import { ScoringEngineService, CurrentSetState } from './scoring-engine.service';

describe('ScoringEngineService', () => {
  let engine: ScoringEngineService;

  beforeEach(() => {
    engine = new ScoringEngineService();
  });

  describe('Standard Set Winning', () => {
    it('wins set at 21 when leading by 2 points', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 20,
        scoreTeamB: 18,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 0, 0);

      expect(result.newScoreTeamA).toBe(21);
      expect(result.newScoreTeamB).toBe(18);
      expect(result.isSetWon).toBe(true);
      expect(result.setWinner).toBe('TEAM_A');
      expect(result.isMatchWon).toBe(false);
    });

    it('does not win at 21-20 (must lead by 2 points)', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 20,
        scoreTeamB: 20,
        servingTeam: 'TEAM_B',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 0, 0);

      expect(result.newScoreTeamA).toBe(21);
      expect(result.newScoreTeamB).toBe(20);
      expect(result.isSetWon).toBe(false);
      expect(result.setWinner).toBeUndefined();
    });
  });

  describe('Deuce Rules', () => {
    it('detects deuce when scores are tied at 20 or higher', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 20,
        scoreTeamB: 19,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_B', 0, 0);

      expect(result.newScoreTeamA).toBe(20);
      expect(result.newScoreTeamB).toBe(20);
      expect(result.isDeuce).toBe(true);
      expect(result.isSetWon).toBe(false);
    });

    it('wins at 22-20 after deuce', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 21,
        scoreTeamB: 20,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 0, 0);

      expect(result.newScoreTeamA).toBe(22);
      expect(result.newScoreTeamB).toBe(20);
      expect(result.isSetWon).toBe(true);
      expect(result.setWinner).toBe('TEAM_A');
    });

    it('continues past 25-25 until 2 points lead', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 25,
        scoreTeamB: 24,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 0, 0);

      expect(result.newScoreTeamA).toBe(26);
      expect(result.newScoreTeamB).toBe(24);
      expect(result.isSetWon).toBe(true);
      expect(result.setWinner).toBe('TEAM_A');
    });
  });

  describe('Sudden Death Cap at 30', () => {
    it('identifies sudden death at 29-29', () => {
      const state: CurrentSetState = {
        setNumber: 2,
        scoreTeamA: 28,
        scoreTeamB: 29,
        servingTeam: 'TEAM_B',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 1, 0);

      expect(result.newScoreTeamA).toBe(29);
      expect(result.newScoreTeamB).toBe(29);
      expect(result.isSuddenDeath).toBe(true);
      expect(result.isSetWon).toBe(false);
    });

    it('wins set at 30-29 without needing 2-point lead', () => {
      const state: CurrentSetState = {
        setNumber: 2,
        scoreTeamA: 29,
        scoreTeamB: 29,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_B', 1, 0);

      expect(result.newScoreTeamA).toBe(29);
      expect(result.newScoreTeamB).toBe(30);
      expect(result.isSetWon).toBe(true);
      expect(result.setWinner).toBe('TEAM_B');
    });
  });

  describe('Match Winning Condition', () => {
    it('wins match when winning second set (2-0)', () => {
      const state: CurrentSetState = {
        setNumber: 2,
        scoreTeamA: 20,
        scoreTeamB: 15,
        servingTeam: 'TEAM_A',
      };

      // Prior sets won: Team A has won 1 set, Team B 0
      const result = engine.calculatePoint(state, 'TEAM_A', 1, 0);

      expect(result.isSetWon).toBe(true);
      expect(result.setWinner).toBe('TEAM_A');
      expect(result.isMatchWon).toBe(true);
      expect(result.matchWinner).toBe('TEAM_A');
    });

    it('goes to deciding set 3 when 1-1', () => {
      const state: CurrentSetState = {
        setNumber: 2,
        scoreTeamA: 18,
        scoreTeamB: 20,
        servingTeam: 'TEAM_B',
      };

      // Team A won Set 1 (1-0), Team B now wins Set 2
      const result = engine.calculatePoint(state, 'TEAM_B', 1, 0);

      expect(result.isSetWon).toBe(true);
      expect(result.setWinner).toBe('TEAM_B');
      expect(result.isMatchWon).toBe(false);
    });

    it('wins match when winning deciding set 3 (2-1)', () => {
      const state: CurrentSetState = {
        setNumber: 3,
        scoreTeamA: 20,
        scoreTeamB: 19,
        servingTeam: 'TEAM_A',
      };

      // 1-1 in sets
      const result = engine.calculatePoint(state, 'TEAM_A', 1, 1);

      expect(result.isSetWon).toBe(true);
      expect(result.isMatchWon).toBe(true);
      expect(result.matchWinner).toBe('TEAM_A');
    });
  });

  describe('11-point Interval', () => {
    it('triggers interval in set 1 when leading team reaches 11', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 10,
        scoreTeamB: 8,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 0, 0);

      expect(result.newScoreTeamA).toBe(11);
      expect(result.isIntervalReached).toBe(true);
      expect(result.intervalMessage).toContain('60 giây');
    });

    it('triggers interval and side swap in set 3 at 11 points', () => {
      const state: CurrentSetState = {
        setNumber: 3,
        scoreTeamA: 7,
        scoreTeamB: 10,
        servingTeam: 'TEAM_B',
      };

      const result = engine.calculatePoint(state, 'TEAM_B', 1, 1);

      expect(result.newScoreTeamB).toBe(11);
      expect(result.isIntervalReached).toBe(true);
      expect(result.intervalMessage).toContain('đổi sân');
    });

    it('does not trigger interval again after 11 points', () => {
      const state: CurrentSetState = {
        setNumber: 1,
        scoreTeamA: 11,
        scoreTeamB: 9,
        servingTeam: 'TEAM_A',
      };

      const result = engine.calculatePoint(state, 'TEAM_A', 0, 0);

      expect(result.newScoreTeamA).toBe(12);
      expect(result.isIntervalReached).toBe(false);
    });
  });

  describe('Service Court and Doubles Rotation', () => {
    it('returns RIGHT court for even score and LEFT for odd score', () => {
      expect(engine.getServiceCourtSide(0)).toBe('RIGHT');
      expect(engine.getServiceCourtSide(1)).toBe('LEFT');
      expect(engine.getServiceCourtSide(2)).toBe('RIGHT');
      expect(engine.getServiceCourtSide(15)).toBe('LEFT');
      expect(engine.getServiceCourtSide(20)).toBe('RIGHT');
    });

    it('swaps court sides for serving team when they win the rally', () => {
      const posA = { rightPlayerId: 'A1', leftPlayerId: 'A2' };
      const posB = { rightPlayerId: 'B1', leftPlayerId: 'B2' };

      // Team A served at 0-0 and won the rally -> new score 1
      const updated = engine.updateDoublesPositions(posA, posB, 'TEAM_A', 'TEAM_A', 1);

      // Team A players swap sides: A1 was right, now left; A2 was left, now right
      expect(updated.positionsA.rightPlayerId).toBe('A2');
      expect(updated.positionsA.leftPlayerId).toBe('A1');

      // Team B players do NOT swap
      expect(updated.positionsB.rightPlayerId).toBe('B1');
      expect(updated.positionsB.leftPlayerId).toBe('B2');

      // Score is 1 (ODD) -> server is left court player (A1)
      expect(updated.nextServerId).toBe('A1');
      // Receiver is left court player of Team B (B2)
      expect(updated.nextReceiverId).toBe('B2');
    });

    it('does not swap positions for either team on service over', () => {
      const posA = { rightPlayerId: 'A1', leftPlayerId: 'A2' };
      const posB = { rightPlayerId: 'B1', leftPlayerId: 'B2' };

      // Team A served, but Team B won the rally (Service Over) -> Team B score becomes 1
      const updated = engine.updateDoublesPositions(posA, posB, 'TEAM_A', 'TEAM_B', 1);

      // Neither team swaps court sides
      expect(updated.positionsA.rightPlayerId).toBe('A1');
      expect(updated.positionsA.leftPlayerId).toBe('A2');
      expect(updated.positionsB.rightPlayerId).toBe('B1');
      expect(updated.positionsB.leftPlayerId).toBe('B2');

      // New score for Team B is 1 (ODD) -> server is left court player of Team B (B2)
      expect(updated.nextServerId).toBe('B2');
    });
  });
});

