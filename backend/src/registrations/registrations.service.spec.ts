import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  TournamentStatus,
  PlayType,
  RegistrationStatus,
  CheckInStatus,
  PaymentStatus,
} from '@prisma/client';

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn((cb) => cb(prismaService)),
      event: {
        findUnique: jest.fn(),
      },
      participant: {
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      participantMember: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      registration: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw BadRequestException if tournament is not REGISTRATION_OPEN', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        isRegistrationOpen: true,
        tournament: { status: TournamentStatus.DRAFT },
      });

      await expect(
        service.register({ eventId: 'event_1' }, 'user_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if event reached maxParticipants', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        isRegistrationOpen: true,
        maxParticipants: 16,
        tournament: { status: TournamentStatus.REGISTRATION_OPEN },
      });
      prismaService.participant.count.mockResolvedValue(16);

      await expect(
        service.register({ eventId: 'event_1' }, 'user_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if player is already registered in the same event', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        isRegistrationOpen: true,
        maxParticipants: 16,
        tournament: { status: TournamentStatus.REGISTRATION_OPEN, maxEventsPerPlayer: 2 },
      });
      prismaService.participant.count.mockResolvedValue(5);
      prismaService.participantMember.count.mockResolvedValue(0);
      prismaService.participantMember.findFirst.mockResolvedValue({
        id: 'member_1',
        userId: 'user_1',
      });

      await expect(
        service.register({ eventId: 'event_1' }, 'user_1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should register singles participant successfully', async () => {
      prismaService.event.findUnique.mockResolvedValue({
        id: 'event_1',
        tournamentId: 'tourn_1',
        name: 'Đơn Nam Nâng Cao',
        playType: PlayType.SINGLE_MEN,
        isRegistrationOpen: true,
        maxParticipants: 16,
        entryFee: 150000,
        currency: 'VND',
        tournament: {
          id: 'tourn_1',
          status: TournamentStatus.REGISTRATION_OPEN,
          maxEventsPerPlayer: 2,
        },
      });

      prismaService.participant.count.mockResolvedValue(4);
      prismaService.participantMember.count.mockResolvedValue(0);
      prismaService.participantMember.findFirst.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user_1',
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
      });

      const mockParticipant = { id: 'part_1', displayName: 'Nguyễn Văn A' };
      prismaService.participant.create.mockResolvedValue(mockParticipant);
      prismaService.registration.create.mockResolvedValue({ id: 'reg_1' });
      prismaService.payment.create.mockResolvedValue({ id: 'pay_1' });

      const res = await service.register({ eventId: 'event_1' }, 'user_1');

      expect(res.displayName).toBe('Nguyễn Văn A');
      expect(res.status).toBe(RegistrationStatus.PENDING);
      expect(prismaService.participant.create).toHaveBeenCalled();
      expect(prismaService.registration.create).toHaveBeenCalled();
      expect(prismaService.payment.create).toHaveBeenCalled();
    });
  });

  describe('approval workflow', () => {
    it('approve: should update registration and participant status to APPROVED', async () => {
      prismaService.registration.findUnique.mockResolvedValue({
        id: 'reg_1',
        participantId: 'part_1',
        status: RegistrationStatus.PENDING,
        participant: {
          event: { tournamentId: 'tourn_1' },
        },
      });

      prismaService.registration.update.mockResolvedValue({
        id: 'reg_1',
        status: RegistrationStatus.APPROVED,
      });

      const res = await service.approve('reg_1', 'reviewer_1');
      expect(res.status).toBe(RegistrationStatus.APPROVED);
      expect(prismaService.participant.update).toHaveBeenCalledWith({
        where: { id: 'part_1' },
        data: { registrationStatus: RegistrationStatus.APPROVED },
      });
    });

    it('reject: should update status to REJECTED with reason', async () => {
      prismaService.registration.findUnique.mockResolvedValue({
        id: 'reg_1',
        participantId: 'part_1',
        status: RegistrationStatus.PENDING,
        participant: {
          event: { tournamentId: 'tourn_1' },
        },
      });

      prismaService.registration.update.mockResolvedValue({
        id: 'reg_1',
        status: RegistrationStatus.REJECTED,
      });

      const res = await service.reject(
        'reg_1',
        { rejectionReason: 'Không đủ điều kiện điều lệ' },
        'reviewer_1',
      );
      expect(res.status).toBe(RegistrationStatus.REJECTED);
      expect(prismaService.participant.update).toHaveBeenCalledWith({
        where: { id: 'part_1' },
        data: { registrationStatus: RegistrationStatus.REJECTED },
      });
    });
  });
});

