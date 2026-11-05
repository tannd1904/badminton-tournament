import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { TournamentStatus, StaffRole, StaffStatus, CourtStatus } from '@prisma/client';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
      tournament: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tournamentStaff: {
        create: jest.fn(),
      },
      court: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if registrationCloseAt <= registrationOpenAt', async () => {
      await expect(
        service.create(
          {
            name: 'Giải Cầu Lông Hà Nội',
            sportId: 'sport_1',
            registrationOpenAt: '2027-02-10T00:00:00Z',
            registrationCloseAt: '2027-02-05T00:00:00Z', // Before open
            tournamentStartAt: '2027-02-15T00:00:00Z',
            tournamentEndAt: '2027-02-20T00:00:00Z',
          },
          'user_1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create tournament with default courts and ORGANIZER role', async () => {
      prismaService.tournament.findUnique.mockResolvedValue(null);
      const mockCreated = {
        id: 'tourn_1',
        name: 'Giải Cầu Lông Mùa Xuân 2027',
        slug: 'giai-cau-long-mua-xuan-2027',
        status: TournamentStatus.DRAFT,
      };
      prismaService.tournament.create.mockResolvedValue(mockCreated);

      const result = await service.create(
        {
          name: 'Giải Cầu Lông Mùa Xuân 2027',
          sportId: 'sport_1',
          registrationOpenAt: '2027-01-01T00:00:00Z',
          registrationCloseAt: '2027-01-20T00:00:00Z',
          tournamentStartAt: '2027-02-01T00:00:00Z',
          tournamentEndAt: '2027-02-05T00:00:00Z',
          totalCourts: 4,
        },
        'user_1',
      );

      expect(result).toEqual(mockCreated);
      expect(prismaService.tournamentStaff.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tournamentId: 'tourn_1',
          userId: 'user_1',
          role: StaffRole.ORGANIZER,
          status: StaffStatus.ACCEPTED,
        }),
      });
      expect(prismaService.court.create).toHaveBeenCalledTimes(4);
    });
  });

  describe('State Machine Transitions', () => {
    it('submitApproval: should transition from DRAFT to PENDING_APPROVAL', async () => {
      prismaService.tournament.findFirst.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.DRAFT,
      });
      prismaService.tournament.findUnique.mockResolvedValue({
        status: TournamentStatus.DRAFT,
      });
      prismaService.tournament.update.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.PENDING_APPROVAL,
      });

      const res = await service.submitApproval('tourn_1', 'user_1');
      expect(res.status).toBe(TournamentStatus.PENDING_APPROVAL);
      expect(prismaService.tournament.update).toHaveBeenCalledWith({
        where: { id: 'tourn_1' },
        data: { status: TournamentStatus.PENDING_APPROVAL },
      });
    });

    it('submitApproval: should throw if tournament is not DRAFT', async () => {
      prismaService.tournament.findFirst.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.REGISTRATION_OPEN,
      });

      await expect(service.submitApproval('tourn_1', 'user_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('closeRegistration: should throw if not REGISTRATION_OPEN', async () => {
      prismaService.tournament.findFirst.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.DRAFT,
      });

      await expect(service.closeRegistration('tourn_1', 'user_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('publishSchedule: should throw if draw is not completed', async () => {
      prismaService.tournament.findFirst.mockResolvedValue({
        id: 'tourn_1',
        status: TournamentStatus.REGISTRATION_CLOSED,
      });

      await expect(service.publishSchedule('tourn_1', 'user_1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

