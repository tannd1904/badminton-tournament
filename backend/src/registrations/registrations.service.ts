import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RejectRegistrationDto, UpdatePaymentDto } from './dto/review-registration.dto';
import {
  RegistrationStatus,
  ParticipantType,
  TournamentStatus,
  PaymentStatus,
  CheckInStatus,
  PlayType,
} from '@prisma/client';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: CreateRegistrationDto, currentUserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: {
        tournament: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Nội dung thi đấu không tồn tại');
    }

    if (event.tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException(
        `Giải đấu hiện không mở đăng ký (Trạng thái: ${event.tournament.status})`,
      );
    }

    if (!event.isRegistrationOpen) {
      throw new BadRequestException('Nội dung này đã đóng cổng tiếp nhận đăng ký');
    }

    // 1. Check Max Participants in Event
    const approvedCount = await this.prisma.participant.count({
      where: {
        eventId: dto.eventId,
        registrationStatus: { in: [RegistrationStatus.APPROVED, RegistrationStatus.PENDING] },
      },
    });

    if (approvedCount >= event.maxParticipants) {
      throw new BadRequestException('Nội dung thi đấu đã đạt đủ số lượng đăng ký tối đa');
    }

    // 2. Check Tournament Max Events Per Player
    const playerExistingRegistrations = await this.prisma.participantMember.count({
      where: {
        userId: currentUserId,
        participant: {
          event: {
            tournamentId: event.tournamentId,
          },
          registrationStatus: { not: RegistrationStatus.REJECTED },
        },
      },
    });

    if (playerExistingRegistrations >= event.tournament.maxEventsPerPlayer) {
      throw new BadRequestException(
        `Bạn đã đạt giới hạn tối đa ${event.tournament.maxEventsPerPlayer} nội dung đăng ký trong giải đấu này`,
      );
    }

    // 3. Check Duplicate in the Same Event
    const alreadyInEvent = await this.prisma.participantMember.findFirst({
      where: {
        userId: currentUserId,
        participant: {
          eventId: dto.eventId,
          registrationStatus: { not: RegistrationStatus.REJECTED },
        },
      },
    });

    if (alreadyInEvent) {
      throw new ConflictException('Bạn đã đăng ký nội dung thi đấu này rồi');
    }

    // 4. Validate Doubles Info if applicable
    const isDoubles = (
      [
        PlayType.DOUBLE_MEN,
        PlayType.DOUBLE_WOMEN,
        PlayType.DOUBLE_MIXED,
      ] as PlayType[]
    ).includes(event.playType);

    let partnerUser: any = null;
    let partnerName = dto.partnerName?.trim() || '';

    if (isDoubles) {
      if (dto.partnerUserId) {
        if (dto.partnerUserId === currentUserId) {
          throw new BadRequestException('Bạn không thể chọn chính mình làm bạn đánh cặp');
        }

        partnerUser = await this.prisma.user.findUnique({
          where: { id: dto.partnerUserId },
        });

        if (!partnerUser) {
          throw new NotFoundException('Không tìm thấy tài khoản người bạn đánh cặp');
        }

        partnerName = partnerUser.fullName;

        // Check partner in same event
        const partnerInSameEvent = await this.prisma.participantMember.findFirst({
          where: {
            userId: partnerUser.id,
            participant: {
              eventId: dto.eventId,
              registrationStatus: { not: RegistrationStatus.REJECTED },
            },
          },
        });

        if (partnerInSameEvent) {
          throw new ConflictException(
            `Vận động viên ${partnerUser.fullName} đã đăng ký trong nội dung này cùng một người khác`,
          );
        }
      }

      if (!partnerName) {
        throw new BadRequestException('Nội dung đôi yêu cầu nhập thông tin bạn đánh cặp');
      }
    }

    // Get current user profile
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const displayName = isDoubles
      ? `${currentUser.fullName} / ${partnerName}`
      : currentUser.fullName;

    // Execute Registration in ACID Transaction
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: {
          eventId: dto.eventId,
          clubId: dto.clubId || null,
          displayName,
          participantType: isDoubles ? ParticipantType.PAIR : ParticipantType.INDIVIDUAL,
          registrationStatus: RegistrationStatus.PENDING,
          checkInStatus: CheckInStatus.NOT_CHECKED_IN,
        },
      });

      // Member 1 (Applicant)
      await tx.participantMember.create({
        data: {
          participantId: participant.id,
          userId: currentUserId,
          playerNameSnapshot: currentUser.fullName,
          playerPhoneSnapshot: currentUser.phone || null,
          memberOrder: 1,
        },
      });

      // Member 2 (Partner if doubles)
      if (isDoubles) {
        await tx.participantMember.create({
          data: {
            participantId: participant.id,
            userId: partnerUser?.id || null,
            playerNameSnapshot: partnerName,
            playerPhoneSnapshot: dto.partnerPhone || partnerUser?.phone || null,
            memberOrder: 2,
          },
        });
      }

      // Registration Record
      const registration = await tx.registration.create({
        data: {
          participantId: participant.id,
          submittedBy: currentUserId,
          status: RegistrationStatus.PENDING,
        },
      });

      // Payment Record
      await tx.payment.create({
        data: {
          participantId: participant.id,
          amount: event.entryFee,
          currency: event.currency,
          status: Number(event.entryFee) === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          tournamentId: event.tournamentId,
          action: 'REGISTRATION_SUBMITTED',
          entityType: 'REGISTRATION',
          entityId: registration.id,
          newValue: { displayName, eventName: event.name },
        },
      });

      return {
        registrationId: registration.id,
        participantId: participant.id,
        displayName,
        status: RegistrationStatus.PENDING,
        entryFee: event.entryFee,
      };
    });
  }

  async findByTournament(tournamentId: string) {
    return this.prisma.registration.findMany({
      where: {
        participant: {
          event: {
            tournamentId,
          },
        },
      },
      include: {
        participant: {
          include: {
            event: {
              select: { id: true, name: true, playType: true, entryFee: true, format: true },
            },
            club: true,
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, phone: true },
                },
              },
              orderBy: { memberOrder: 'asc' },
            },
            payments: true,
          },
        },
        submitter: {
          select: { id: true, fullName: true, email: true },
        },
        reviewer: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.registration.findMany({
      where: {
        participant: {
          eventId,
        },
      },
      include: {
        participant: {
          include: {
            club: true,
            members: true,
            payments: true,
          },
        },
        submitter: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async approve(registrationId: string, reviewerUserId: string) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { participant: { include: { event: true } } },
    });

    if (!reg) {
      throw new NotFoundException('Hồ sơ đăng ký không tồn tại');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReg = await tx.registration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.participant.update({
        where: { id: reg.participantId },
        data: { registrationStatus: RegistrationStatus.APPROVED },
      });

      await tx.auditLog.create({
        data: {
          userId: reviewerUserId,
          tournamentId: reg.participant.event.tournamentId,
          action: 'REGISTRATION_APPROVED',
          entityType: 'REGISTRATION',
          entityId: registrationId,
          oldValue: { status: reg.status },
          newValue: { status: RegistrationStatus.APPROVED },
        },
      });

      return updatedReg;
    });
  }

  async reject(registrationId: string, dto: RejectRegistrationDto, reviewerUserId: string) {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { participant: { include: { event: true } } },
    });

    if (!reg) {
      throw new NotFoundException('Hồ sơ đăng ký không tồn tại');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReg = await tx.registration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.REJECTED,
          rejectionReason: dto.rejectionReason,
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.participant.update({
        where: { id: reg.participantId },
        data: { registrationStatus: RegistrationStatus.REJECTED },
      });

      await tx.auditLog.create({
        data: {
          userId: reviewerUserId,
          tournamentId: reg.participant.event.tournamentId,
          action: 'REGISTRATION_REJECTED',
          entityType: 'REGISTRATION',
          entityId: registrationId,
          oldValue: { status: reg.status },
          newValue: { status: RegistrationStatus.REJECTED, reason: dto.rejectionReason },
        },
      });

      return updatedReg;
    });
  }

  async checkInParticipant(participantId: string, operatorUserId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: { event: true },
    });

    if (!participant) {
      throw new NotFoundException('Không tìm thấy người tham gia');
    }

    const nextStatus =
      participant.checkInStatus === CheckInStatus.CHECKED_IN
        ? CheckInStatus.NOT_CHECKED_IN
        : CheckInStatus.CHECKED_IN;

    const updated = await this.prisma.participant.update({
      where: { id: participantId },
      data: { checkInStatus: nextStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId: participant.event.tournamentId,
        action: 'PARTICIPANT_CHECKIN_TOGGLED',
        entityType: 'PARTICIPANT',
        entityId: participantId,
        newValue: { checkInStatus: nextStatus },
      },
    });

    return updated;
  }

  async updatePayment(paymentId: string, dto: UpdatePaymentDto, operatorUserId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { participant: { include: { event: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy bản ghi thanh toán');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: dto.status,
        transactionReference: dto.transactionReference || payment.transactionReference,
        paidAt: dto.status === PaymentStatus.PAID ? new Date() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId: payment.participant.event.tournamentId,
        action: 'PAYMENT_UPDATED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        oldValue: { status: payment.status },
        newValue: { status: dto.status },
      },
    });

    return updated;
  }

  async exportCsv(tournamentId: string): Promise<string> {
    const registrations = await this.findByTournament(tournamentId);

    const headers = [
      'Mã Đăng Ký',
      'Nội Dung',
      'Tên Hiển Thị',
      'CLB',
      'VĐV 1',
      'SĐT VĐV 1',
      'VĐV 2 (Đôi)',
      'SĐT VĐV 2',
      'Trạng Thái Hồ Sơ',
      'Điểm Danh',
      'Lệ Phí',
      'Thanh Toán',
      'Thời Gian Đăng Ký',
    ];

    const rows = registrations.map((r) => {
      const p = r.participant;
      const m1 = p.members.find((m) => m.memberOrder === 1);
      const m2 = p.members.find((m) => m.memberOrder === 2);
      const payment = p.payments[0];

      return [
        r.id,
        p.event.name,
        `"${p.displayName.replace(/"/g, '""')}"`,
        `"${(p.club?.name || 'Tự do').replace(/"/g, '""')}"`,
        `"${(m1?.playerNameSnapshot || '').replace(/"/g, '""')}"`,
        m1?.playerPhoneSnapshot || '',
        `"${(m2?.playerNameSnapshot || '').replace(/"/g, '""')}"`,
        m2?.playerPhoneSnapshot || '',
        r.status,
        p.checkInStatus,
        payment ? Number(payment.amount) : 0,
        payment ? payment.status : 'PENDING',
        new Date(r.submittedAt).toISOString(),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
