import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSeed(
    participantId: string,
    isSeeded: boolean,
    seedNumber: number | null,
    operatorUserId: string,
  ) {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: { event: true },
    });

    if (!participant) {
      throw new NotFoundException('Không tìm thấy VĐV / cặp đôi');
    }

    if (isSeeded && seedNumber) {
      // Check if seedNumber is already taken in this event
      const existing = await this.prisma.participant.findFirst({
        where: {
          eventId: participant.eventId,
          seedNumber,
          id: { not: participantId },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Hạt giống số ${seedNumber} đã được gán cho ${existing.displayName}`,
        );
      }
    }

    const updated = await this.prisma.participant.update({
      where: { id: participantId },
      data: {
        isSeeded,
        seedNumber: isSeeded ? seedNumber : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId: participant.event.tournamentId,
        action: 'PARTICIPANT_SEED_UPDATED',
        entityType: 'PARTICIPANT',
        entityId: participantId,
        newValue: { isSeeded, seedNumber: isSeeded ? seedNumber : null },
      },
    });

    return updated;
  }

  async findApprovedByEvent(eventId: string) {
    return this.prisma.participant.findMany({
      where: {
        eventId,
        registrationStatus: 'APPROVED',
      },
      include: {
        club: true,
        members: true,
      },
      orderBy: [
        { isSeeded: 'desc' },
        { seedNumber: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }
}

