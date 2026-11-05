import { Test, TestingModule } from '@nestjs/testing';
import { BracketsService } from './brackets.service';
import { TournamentEngineService } from './tournament-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventStatus, MatchStatus, NextMatchSlot } from '@prisma/client';

describe('BracketsService', () => {
  let service: BracketsService;
  let engine: TournamentEngineService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
      event: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      match: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      matchSet: {
        create: jest.fn(),
      },
      stage: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      group: {
        create: jest.fn(),
      },
      groupParticipant: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BracketsService,
        TournamentEngineService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<BracketsService>(BracketsService);
    engine = module.get<TournamentEngineService>(TournamentEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('previewDraw', () => {
    it('should throw NotFoundException if event does not exist', async () => {
      prismaService.event.findUnique.mockResolvedValue(null);
      await expect(service.previewDraw('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if < 2 approved participants', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        participants: [{ id: 'p1', displayName: 'Player 1' }],
      });
      await expect(service.previewDraw('event_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate knockout preview for approved participants', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        name: 'Đơn Nam',
        format: 'KNOCKOUT',
        participants: [
          { id: 'p1', displayName: 'Player 1', isSeeded: true, seedNumber: 1, clubId: 'c1' },
          { id: 'p2', displayName: 'Player 2', isSeeded: true, seedNumber: 2, clubId: 'c2' },
          { id: 'p3', displayName: 'Player 3', isSeeded: false, clubId: 'c1' },
          { id: 'p4', displayName: 'Player 4', isSeeded: false, clubId: 'c2' },
        ],
      });

      const res: any = await service.previewDraw('event_1');
      expect(res.bracketSize).toBe(4);
      expect(res.totalRounds).toBe(2);
      expect(res.firstRoundMatches.length).toBe(2);
    });
  });

  describe('confirmDraw', () => {
    it('should throw BadRequestException if matches have already started', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        participants: [
          { id: 'p1', displayName: 'P1' },
          { id: 'p2', displayName: 'P2' },
        ],
        stages: [
          {
            matches: [{ status: 'IN_PROGRESS' }],
          },
        ],
      });

      await expect(service.confirmDraw('event_1', 'user_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should commit binary tree matches and advance byes', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        name: 'Đôi Nam',
        format: 'KNOCKOUT',
        tournamentId: 'tourn_1',
        stages: [],
        participants: [
          { id: 'p1', displayName: 'P1', isSeeded: true, seedNumber: 1 },
          { id: 'p2', displayName: 'P2', isSeeded: true, seedNumber: 2 },
          { id: 'p3', displayName: 'P3', isSeeded: false },
        ], // 3 players -> 4 slot bracket, 1 Bye
      });

      prismaService.stage.create.mockResolvedValue({ id: 'stage_1' });
      prismaService.match.create.mockImplementation((args: any) => ({
        id: `match_${args.data.bracketPosition}_r${args.data.roundNumber}`,
        ...args.data,
      }));

      const res: any = await service.confirmDraw('event_1', 'user_1');

      expect(res.success).toBe(true);
      expect(res.bracketSize).toBe(4);
      expect(prismaService.stage.create).toHaveBeenCalled();
      expect(prismaService.event.update).toHaveBeenCalledWith({
        where: { id: 'event_1' },
        data: { status: EventStatus.DRAWN },
      });
    });
  });
});

