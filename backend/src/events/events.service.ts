import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus, TournamentStatus } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTournament(tournamentId: string) {
    return this.prisma.event.findMany({
      where: { tournamentId },
      include: {
        _count: {
          select: {
            participants: true,
            matches: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        stages: {
          include: {
            groups: {
              include: {
                participants: {
                  include: { participant: true },
                },
              },
            },
          },
          orderBy: { stageOrder: 'asc' },
        },
        participants: {
          include: {
            club: true,
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, phone: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        matches: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Nội dung thi đấu không tồn tại');
    }

    return event;
  }

  async create(dto: CreateEventDto, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: dto.tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    if (
      tournament.status === TournamentStatus.COMPLETED ||
      tournament.status === TournamentStatus.CANCELLED
    ) {
      throw new BadRequestException('Không thể thêm nội dung vào giải đấu đã kết thúc hoặc bị hủy');
    }

    const event = await this.prisma.event.create({
      data: {
        tournamentId: dto.tournamentId,
        name: dto.name,
        groupType: dto.groupType || 'OPEN',
        playType: dto.playType,
        format: dto.format,
        entryFee: dto.entryFee || 0,
        currency: dto.currency || 'VND',
        maxParticipants: dto.maxParticipants || 16,
        autoDraw: dto.autoDraw ?? true,
        hasThirdPlaceMatch: dto.hasThirdPlaceMatch ?? true,
        winPoints: dto.winPoints || 2,
        losePoints: dto.losePoints || 0,
        defaultSetsToWin: dto.defaultSetsToWin || 2,
        status: EventStatus.OPEN,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        tournamentId: dto.tournamentId,
        action: 'EVENT_CREATED',
        entityType: 'EVENT',
        entityId: event.id,
        newValue: { name: event.name, playType: event.playType, format: event.format },
      },
    });

    return event;
  }

  async update(id: string, dto: UpdateEventDto, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!event) {
      throw new NotFoundException('Nội dung thi đấu không tồn tại');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        tournamentId: event.tournamentId,
        action: 'EVENT_UPDATED',
        entityType: 'EVENT',
        entityId: id,
        oldValue: { name: event.name, status: event.status },
        newValue: JSON.parse(JSON.stringify(dto)),
      },
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true, matches: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Nội dung thi đấu không tồn tại');
    }

    if (event._count.matches > 0) {
      throw new BadRequestException('Không thể xóa nội dung đã có trận đấu trong lịch');
    }

    const deleted = await this.prisma.event.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        tournamentId: event.tournamentId,
        action: 'EVENT_DELETED',
        entityType: 'EVENT',
        entityId: id,
        oldValue: { name: event.name },
      },
    });

    return deleted;
  }
}
