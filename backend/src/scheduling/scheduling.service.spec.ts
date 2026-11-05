import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingService } from './scheduling.service';
import { SchedulingEngineService } from './scheduling-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TournamentStatus, MatchStatus } from '@prisma/client';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let prisma: any;
  let engine: any;

  beforeEach(async () => {
    prisma = {
      tournament: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      match: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    engine = {
      detectConflicts: jest.fn().mockReturnValue([]),
      generateAutoSchedule: jest.fn().mockImplementation((matches) => matches),
      recalculateOverrun: jest.fn().mockReturnValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: PrismaService, useValue: prisma },
        { provide: SchedulingEngineService, useValue: engine },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTournamentSchedule', () => {
    it('throws NotFoundException if tournament does not exist', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);
      await expect(service.getTournamentSchedule('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns tournament schedule with detected conflicts', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 'tour-1',
        status: TournamentStatus.DRAW_COMPLETED,
        matchIntervalMinutes: 10,
        courts: [{ id: 'court-1', name: 'Sân 1', courtOrder: 1 }],
      });
      prisma.match.findMany.mockResolvedValue([
        {
          id: 'm1',
          matchCode: 'MD-R1-01',
          roundNumber: 1,
          bracketPosition: 1,
          courtId: 'court-1',
          scheduledStartTime: new Date('2026-11-10T08:00:00Z'),
          estimatedDurationMinutes: 30,
          isTimeLocked: false,
          refereeUserId: null,
          teamA: { id: 't1', members: [{ userId: 'u1' }] },
          teamB: { id: 't2', members: [{ userId: 'u2' }] },
        },
      ]);

      const result = await service.getTournamentSchedule('tour-1');
      expect(result.tournamentId).toBe('tour-1');
      expect(result.totalMatches).toBe(1);
      expect(result.scheduledCount).toBe(1);
      expect(engine.detectConflicts).toHaveBeenCalled();
    });
  });

  describe('autoGenerateSchedule', () => {
    it('throws BadRequestException if tournament has no courts', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 'tour-1',
        courts: [],
      });

      await expect(service.autoGenerateSchedule('tour-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if no scheduled/ready matches exist', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 'tour-1',
        courts: [{ id: 'c1', name: 'Court 1', courtOrder: 1 }],
      });
      prisma.match.findMany.mockResolvedValue([]);

      await expect(service.autoGenerateSchedule('tour-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully generates and updates schedule', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 'tour-1',
        tournamentStartAt: new Date('2026-11-10T08:00:00Z'),
        defaultMatchDurationMinutes: 30,
        matchIntervalMinutes: 10,
        courts: [{ id: 'c1', name: 'Court 1', courtOrder: 1 }],
      });
      prisma.match.findMany.mockResolvedValue([
        {
          id: 'm1',
          matchCode: 'M1',
          roundNumber: 1,
          bracketPosition: 1,
          estimatedDurationMinutes: 30,
          isTimeLocked: false,
          teamA: { id: 't1', members: [{ userId: 'u1' }] },
          teamB: { id: 't2', members: [{ userId: 'u2' }] },
        },
      ]);

      engine.generateAutoSchedule.mockReturnValue([
        {
          id: 'm1',
          courtId: 'c1',
          scheduledStartTime: new Date('2026-11-10T08:00:00Z'),
          estimatedDurationMinutes: 30,
          isTimeLocked: false,
        },
      ]);

      const res = await service.autoGenerateSchedule('tour-1', 'admin-1');
      expect(res.success).toBe(true);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: expect.objectContaining({ courtId: 'c1' }),
      });
    });
  });

  describe('toggleLockTime', () => {
    it('toggles time locked status and logs audit', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'm1',
        isTimeLocked: false,
        event: { tournamentId: 'tour-1' },
      });
      prisma.match.update.mockResolvedValue({ id: 'm1', isTimeLocked: true });

      const res = await service.toggleLockTime('m1', true, 'admin-1');
      expect(res.isTimeLocked).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('publishSchedule', () => {
    it('blocks publication if there are critical conflicts', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 'tour-1',
        status: TournamentStatus.DRAW_COMPLETED,
        matchIntervalMinutes: 10,
        courts: [{ id: 'c1' }],
      });
      prisma.match.findMany.mockResolvedValue([
        {
          id: 'm1',
          scheduledStartTime: new Date(),
          courtId: 'c1',
          teamA: { members: [] },
          teamB: { members: [] },
        },
      ]);
      engine.detectConflicts.mockReturnValue([
        { type: 'COURT_OVERLAP', severity: 'ERROR', message: 'Trùng sân' },
      ]);

      await expect(service.publishSchedule('tour-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates tournament status to SCHEDULE_PUBLISHED when valid', async () => {
      prisma.tournament.findUnique.mockResolvedValue({
        id: 'tour-1',
        status: TournamentStatus.DRAW_COMPLETED,
        matchIntervalMinutes: 10,
        courts: [{ id: 'c1' }],
      });
      prisma.match.findMany.mockResolvedValue([
        {
          id: 'm1',
          scheduledStartTime: new Date(),
          courtId: 'c1',
          teamA: { members: [] },
          teamB: { members: [] },
        },
      ]);
      engine.detectConflicts.mockReturnValue([]);
      prisma.tournament.update.mockResolvedValue({
        id: 'tour-1',
        status: TournamentStatus.SCHEDULE_PUBLISHED,
      });

      const res = await service.publishSchedule('tour-1', 'admin-1');
      expect(res.status).toBe(TournamentStatus.SCHEDULE_PUBLISHED);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
