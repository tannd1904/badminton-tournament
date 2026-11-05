import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from './scoring.service';
import { ScoringEngineService } from './scoring-engine.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MatchStatus, NextMatchSlot, ScoreEventType } from '@prisma/client';
import { TeamSideEnum } from './dto/scoring.dto';

describe('ScoringService', () => {
  let service: ScoringService;
  let prisma: any;
  let engine: any;
  let realtime: any;

  beforeEach(async () => {
    prisma = {
      match: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matchSet: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      matchScoreEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    engine = {
      calculatePoint: jest.fn(),
      getServiceCourtSide: jest.fn().mockReturnValue('RIGHT'),
      updateDoublesPositions: jest.fn(),
    };

    realtime = {
      notifyScoreUpdate: jest.fn(),
      notifyMatchCompleted: jest.fn(),
      notifyScheduleUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScoringEngineService, useValue: engine },
        { provide: RealtimeService, useValue: realtime },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startMatch', () => {
    it('throws NotFoundException if match not found', async () => {
      prisma.match.findUnique.mockResolvedValue(null);
      await expect(
        service.startMatch('m1', {}, 'ref-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('starts match and initializes set 1', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.SCHEDULED,
        sets: [],
      });
      prisma.match.update.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.IN_PROGRESS,
      });
      prisma.matchSet.create.mockResolvedValue({
        id: 's1',
        matchId: 'm1',
        setNumber: 1,
        scoreTeamA: 0,
        scoreTeamB: 0,
      });

      const res = await service.startMatch('m1', {}, 'ref-1');
      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MatchStatus.IN_PROGRESS }),
        }),
      );
      expect(prisma.matchSet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ setNumber: 1, scoreTeamA: 0, scoreTeamB: 0 }),
        }),
      );
      expect(prisma.matchScoreEvent.create).toHaveBeenCalled();
    });
  });

  describe('recordPoint', () => {
    it('returns immediately if idempotencyKey already exists', async () => {
      prisma.matchScoreEvent.findUnique.mockResolvedValue({ id: 'evt-1' });
      jest.spyOn(service, 'getMatchScore').mockResolvedValue({ matchId: 'm1' } as any);

      const res = await service.recordPoint(
        'm1',
        { team: TeamSideEnum.TEAM_A, idempotencyKey: 'dup-key' },
        'ref-1',
      );
      expect(service.getMatchScore).toHaveBeenCalledWith('m1');
    });

    it('records a regular point within the set', async () => {
      prisma.matchScoreEvent.findUnique.mockResolvedValue(null);
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.IN_PROGRESS,
        teamAId: 'team-1',
        teamBId: 'team-2',
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            scoreTeamA: 5,
            scoreTeamB: 4,
            completedAt: null,
            servingTeam: 'TEAM_A',
          },
        ],
      });

      engine.calculatePoint.mockReturnValue({
        newScoreTeamA: 6,
        newScoreTeamB: 4,
        servingTeam: 'TEAM_A',
        isSetWon: false,
        isMatchWon: false,
      });

      prisma.matchSet.update.mockResolvedValue({
        id: 'set-1',
        scoreTeamA: 6,
        scoreTeamB: 4,
      });

      const res = await service.recordPoint(
        'm1',
        { team: TeamSideEnum.TEAM_A, idempotencyKey: 'key-1' },
        'ref-1',
      );

      expect(res.success).toBe(true);
      expect(prisma.matchScoreEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matchId: 'm1',
            scoreTeamA: 6,
            scoreTeamB: 4,
            eventType: ScoreEventType.POINT_ADDED,
          }),
        }),
      );
    });

    it('completes match and advances winner to next match in bracket', async () => {
      prisma.matchScoreEvent.findUnique.mockResolvedValue(null);
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.IN_PROGRESS,
        teamAId: 'team-1',
        teamBId: 'team-2',
        nextMatchId: 'next-m1',
        nextMatchSlot: NextMatchSlot.TEAM_A,
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            scoreTeamA: 21,
            scoreTeamB: 15,
            completedAt: new Date(),
            winningTeamId: 'team-1',
          },
          {
            id: 'set-2',
            setNumber: 2,
            scoreTeamA: 20,
            scoreTeamB: 18,
            completedAt: null,
            servingTeam: 'TEAM_A',
          },
        ],
      });

      engine.calculatePoint.mockReturnValue({
        newScoreTeamA: 21,
        newScoreTeamB: 18,
        servingTeam: 'TEAM_A',
        isSetWon: true,
        setWinner: 'TEAM_A',
        isMatchWon: true,
        matchWinner: 'TEAM_A',
      });

      prisma.match.update
        .mockResolvedValueOnce({ id: 'm1', status: MatchStatus.COMPLETED })
        .mockResolvedValueOnce({ id: 'next-m1', teamAId: 'team-1', teamBId: 'team-3' })
        .mockResolvedValueOnce({ id: 'next-m1', status: MatchStatus.READY });

      const res = await service.recordPoint(
        'm1',
        { team: TeamSideEnum.TEAM_A, idempotencyKey: 'match-point-key' },
        'ref-1',
      );

      expect(res.success).toBe(true);
      // Winner is set on current match
      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({
            status: MatchStatus.COMPLETED,
            winnerId: 'team-1',
          }),
        }),
      );
      // Next match slot is populated
      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'next-m1' },
          data: { teamAId: 'team-1' },
        }),
      );
    });
  });

  describe('undoLastPoint', () => {
    it('deletes latest event and restores previous score', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.IN_PROGRESS,
        sets: [{ id: 'set-1', setNumber: 1, scoreTeamA: 5, scoreTeamB: 4 }],
        scoreEvents: [
          { id: 'evt-2', setNumber: 1, scoreTeamA: 5, scoreTeamB: 4 },
          { id: 'evt-1', setNumber: 1, scoreTeamA: 4, scoreTeamB: 4, servingTeam: 'TEAM_B' },
        ],
      });

      const res = await service.undoLastPoint('m1', 'ref-1');

      expect(prisma.matchScoreEvent.delete).toHaveBeenCalledWith({
        where: { id: 'evt-2' },
      });
      expect(prisma.matchSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scoreTeamA: 4,
            scoreTeamB: 4,
            servingTeam: 'TEAM_B',
          }),
        }),
      );
      expect(res.success).toBe(true);
    });

    it('reverts COMPLETED match back to IN_PROGRESS when undoing final point', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.COMPLETED,
        nextMatchId: 'next-m1',
        nextMatchSlot: NextMatchSlot.TEAM_A,
        sets: [{ id: 'set-2', setNumber: 2, scoreTeamA: 21, scoreTeamB: 18 }],
        scoreEvents: [
          { id: 'evt-final', setNumber: 2, scoreTeamA: 21, scoreTeamB: 18 },
          { id: 'evt-prev', setNumber: 2, scoreTeamA: 20, scoreTeamB: 18 },
        ],
      });

      await service.undoLastPoint('m1', 'ref-1');

      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({
            status: MatchStatus.IN_PROGRESS,
            winnerId: null,
          }),
        }),
      );
      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'next-m1' },
          data: { teamAId: null, status: MatchStatus.SCHEDULED },
        }),
      );
    });
  });

  describe('walkoverMatch', () => {
    it('sets match to WALKOVER and advances winner', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatchStatus.SCHEDULED,
        teamAId: 'team-1',
        teamBId: 'team-2',
        sets: [],
      });

      const res = await service.walkoverMatch(
        'm1',
        { winnerTeam: TeamSideEnum.TEAM_A, reason: 'Opponent injury' },
        'ref-1',
      );

      expect(res.success).toBe(true);
      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({
            status: MatchStatus.WALKOVER,
            winnerId: 'team-1',
          }),
        }),
      );
    });
  });
});
