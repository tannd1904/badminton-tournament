import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';

export interface MatchesFilterQuery {
  tournamentId?: string;
  eventId?: string;
  courtId?: string;
  refereeUserId?: string;
  status?: MatchStatus;
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMatches(query: MatchesFilterQuery) {
    const where: any = {};

    if (query.tournamentId) {
      where.event = { tournamentId: query.tournamentId };
    }
    if (query.eventId) {
      where.eventId = query.eventId;
    }
    if (query.courtId) {
      where.courtId = query.courtId;
    }
    if (query.refereeUserId) {
      where.refereeUserId = query.refereeUserId;
    }
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.match.findMany({
      where,
      include: {
        court: true,
        referee: { select: { id: true, fullName: true, email: true } },
        teamA: {
          include: {
            club: true,
            members: {
              include: { user: { select: { id: true, fullName: true } } },
            },
          },
        },
        teamB: {
          include: {
            club: true,
            members: {
              include: { user: { select: { id: true, fullName: true } } },
            },
          },
        },
        winner: true,
        event: {
          select: {
            id: true,
            name: true,
            playType: true,
            tournament: { select: { id: true, name: true, slug: true } },
          },
        },
        sets: { orderBy: { setNumber: 'asc' } },
      },
      orderBy: [
        { scheduledStartTime: 'asc' },
        { roundNumber: 'asc' },
        { bracketPosition: 'asc' },
      ],
    });
  }

  async getMatchById(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        court: true,
        referee: { select: { id: true, fullName: true, email: true } },
        teamA: {
          include: {
            club: true,
            members: {
              include: { user: { select: { id: true, fullName: true } } },
            },
          },
        },
        teamB: {
          include: {
            club: true,
            members: {
              include: { user: { select: { id: true, fullName: true } } },
            },
          },
        },
        winner: true,
        event: {
          select: {
            id: true,
            name: true,
            playType: true,
            tournament: {
              select: {
                id: true,
                name: true,
                slug: true,
                defaultMatchDurationMinutes: true,
              },
            },
          },
        },
        sets: { orderBy: { setNumber: 'asc' } },
        scoreEvents: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    return match;
  }

  async assignReferee(
    matchId: string,
    refereeUserId: string | null,
    operatorUserId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { event: true },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { refereeUserId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId: match.event.tournamentId,
        action: 'MATCH_REFEREE_ASSIGNED',
        entityType: 'MATCH',
        entityId: matchId,
        newValue: { refereeUserId },
      },
    });

    return updated;
  }
}
