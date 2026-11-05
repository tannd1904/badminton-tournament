import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayType, EventFormat, TournamentStatus, EventStatus } from '@prisma/client';

describe('EventsService', () => {
  let service: EventsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      event: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tournament: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if tournament does not exist', async () => {
      prismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            tournamentId: 'invalid_id',
            name: 'Đôi Nam Nâng Cao',
            playType: PlayType.DOUBLE_MEN,
            format: EventFormat.KNOCKOUT,
          },
          'user_1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if tournament is CANCELLED', async () => {
      prismaService.tournament.findUnique.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.CANCELLED,
      });

      await expect(
        service.create(
          {
            tournamentId: 'tourn_1',
            name: 'Đôi Nam Nâng Cao',
            playType: PlayType.DOUBLE_MEN,
            format: EventFormat.KNOCKOUT,
          },
          'user_1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create event successfully', async () => {
      prismaService.tournament.findUnique.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.DRAFT,
      });

      const mockCreated = {
        id: 'event_1',
        tournamentId: 'tourn_1',
        name: 'Đôi Nam Nâng Cao',
        playType: PlayType.DOUBLE_MEN,
        format: EventFormat.KNOCKOUT,
        status: EventStatus.OPEN,
      };
      prismaService.event.create.mockResolvedValue(mockCreated);

      const result = await service.create(
        {
          tournamentId: 'tourn_1',
          name: 'Đôi Nam Nâng Cao',
          playType: PlayType.DOUBLE_MEN,
          format: EventFormat.KNOCKOUT,
          maxParticipants: 16,
        },
        'user_1',
      );

      expect(result).toEqual(mockCreated);
      expect(prismaService.event.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should prevent deletion if matches are already scheduled', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        _count: { matches: 4 },
      });

      await expect(service.delete('event_1', 'user_1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

