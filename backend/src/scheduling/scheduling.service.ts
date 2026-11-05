import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SchedulingEngineService,
  ScheduleMatchInput,
  ScheduleCourtInput,
} from './scheduling-engine.service';
import {
  UpdateMatchScheduleDto,
  RecalculateOverrunDto,
} from './dto/update-schedule.dto';
import { TournamentStatus, MatchStatus } from '@prisma/client';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: SchedulingEngineService,
  ) {}

  async getTournamentSchedule(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        courts: { orderBy: { courtOrder: 'asc' } },
        events: {
          select: { id: true, name: true, playType: true },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    const matches = await this.prisma.match.findMany({
      where: {
        event: { tournamentId },
      },
      include: {
        teamA: {
          include: {
            club: true,
            members: { select: { userId: true } },
          },
        },
        teamB: {
          include: {
            club: true,
            members: { select: { userId: true } },
          },
        },
        winner: true,
        court: true,
        referee: { select: { id: true, fullName: true } },
        event: { select: { id: true, name: true, playType: true } },
      },
      orderBy: [
        { scheduledStartTime: 'asc' },
        { roundNumber: 'asc' },
        { bracketPosition: 'asc' },
      ],
    });

    // Convert matches for conflict detection
    const matchInputs: ScheduleMatchInput[] = matches.map((m) => ({
      id: m.id,
      matchCode: m.matchCode,
      roundNumber: m.roundNumber,
      bracketPosition: m.bracketPosition,
      courtId: m.courtId,
      scheduledStartTime: m.scheduledStartTime,
      estimatedDurationMinutes: m.estimatedDurationMinutes,
      isTimeLocked: m.isTimeLocked,
      refereeUserId: m.refereeUserId,
      teamAAthleteIds: m.teamA ? m.teamA.members.map((mem) => mem.userId || m.teamA!.id) : [],
      teamBAthleteIds: m.teamB ? m.teamB.members.map((mem) => mem.userId || m.teamB!.id) : [],
    }));

    const conflicts = this.engine.detectConflicts(
      matchInputs,
      tournament.matchIntervalMinutes,
    );

    return {
      tournamentId,
      tournamentStatus: tournament.status,
      courts: tournament.courts,
      matches,
      conflicts,
      totalMatches: matches.length,
      scheduledCount: matches.filter((m) => m.scheduledStartTime && m.courtId).length,
    };
  }

  async autoGenerateSchedule(tournamentId: string, operatorUserId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        courts: { orderBy: { courtOrder: 'asc' } },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    if (tournament.courts.length === 0) {
      throw new BadRequestException('Giải đấu chưa có sân thi đấu');
    }

    const matches = await this.prisma.match.findMany({
      where: {
        event: { tournamentId },
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.READY] },
      },
      include: {
        teamA: { include: { members: { select: { userId: true } } } },
        teamB: { include: { members: { select: { userId: true } } } },
      },
    });

    if (matches.length === 0) {
      throw new BadRequestException('Không tìm thấy trận đấu nào cần xếp lịch');
    }

    const matchInputs: ScheduleMatchInput[] = matches.map((m) => ({
      id: m.id,
      matchCode: m.matchCode,
      roundNumber: m.roundNumber,
      bracketPosition: m.bracketPosition,
      courtId: m.courtId,
      scheduledStartTime: m.scheduledStartTime,
      estimatedDurationMinutes: m.estimatedDurationMinutes || tournament.defaultMatchDurationMinutes,
      isTimeLocked: m.isTimeLocked,
      refereeUserId: m.refereeUserId,
      teamAAthleteIds: m.teamA ? m.teamA.members.map((mem) => mem.userId || m.teamA!.id) : [],
      teamBAthleteIds: m.teamB ? m.teamB.members.map((mem) => mem.userId || m.teamB!.id) : [],
    }));

    const courtInputs: ScheduleCourtInput[] = tournament.courts.map((c) => ({
      id: c.id,
      name: c.name,
      courtOrder: c.courtOrder,
    }));

    const scheduled = this.engine.generateAutoSchedule(
      matchInputs,
      courtInputs,
      new Date(tournament.tournamentStartAt),
      tournament.defaultMatchDurationMinutes,
      tournament.matchIntervalMinutes,
      20, // 20 min rest buffer
    );

    // Save in transaction
    return this.prisma.$transaction(async (tx) => {
      for (const item of scheduled) {
        if (!item.isTimeLocked) {
          await tx.match.update({
            where: { id: item.id },
            data: {
              courtId: item.courtId,
              scheduledStartTime: item.scheduledStartTime,
              estimatedDurationMinutes: item.estimatedDurationMinutes,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: operatorUserId,
          tournamentId,
          action: 'SCHEDULE_AUTO_GENERATED',
          entityType: 'TOURNAMENT',
          entityId: tournamentId,
          newValue: { count: scheduled.length },
        },
      });

      return {
        success: true,
        message: `Xếp lịch tự động thành công cho ${scheduled.length} trận đấu`,
        scheduledCount: scheduled.length,
      };
    });
  }

  async updateMatchSchedule(
    matchId: string,
    dto: UpdateMatchScheduleDto,
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
      data: {
        courtId: dto.courtId,
        scheduledStartTime: new Date(dto.scheduledStartTime),
        ...(dto.estimatedDurationMinutes
          ? { estimatedDurationMinutes: dto.estimatedDurationMinutes }
          : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId: match.event.tournamentId,
        action: 'MATCH_SCHEDULE_UPDATED',
        entityType: 'MATCH',
        entityId: matchId,
        oldValue: {
          courtId: match.courtId,
          startTime: match.scheduledStartTime,
        },
        newValue: {
          courtId: dto.courtId,
          startTime: dto.scheduledStartTime,
        },
      },
    });

    return updated;
  }

  async toggleLockTime(
    matchId: string,
    isTimeLocked: boolean,
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
      data: { isTimeLocked },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId: match.event.tournamentId,
        action: isTimeLocked ? 'MATCH_TIME_LOCKED' : 'MATCH_TIME_UNLOCKED',
        entityType: 'MATCH',
        entityId: matchId,
        newValue: { isTimeLocked },
      },
    });

    return updated;
  }

  async recalculateOverrun(dto: RecalculateOverrunDto, operatorUserId: string) {
    const delayedMatch = await this.prisma.match.findUnique({
      where: { id: dto.delayedMatchId },
      include: {
        event: { include: { tournament: { include: { courts: true } } } },
      },
    });

    if (!delayedMatch || !delayedMatch.courtId) {
      throw new NotFoundException('Trận đấu không tồn tại hoặc chưa gán sân');
    }

    const tournament = delayedMatch.event.tournament;

    const matches = await this.prisma.match.findMany({
      where: {
        event: { tournamentId: tournament.id },
      },
      include: {
        teamA: { include: { members: { select: { userId: true } } } },
        teamB: { include: { members: { select: { userId: true } } } },
      },
    });

    const matchInputs: ScheduleMatchInput[] = matches.map((m) => ({
      id: m.id,
      matchCode: m.matchCode,
      roundNumber: m.roundNumber,
      bracketPosition: m.bracketPosition,
      courtId: m.courtId,
      scheduledStartTime: m.scheduledStartTime,
      estimatedDurationMinutes: m.estimatedDurationMinutes,
      isTimeLocked: m.isTimeLocked,
      refereeUserId: m.refereeUserId,
      teamAAthleteIds: m.teamA ? m.teamA.members.map((mem) => mem.userId || m.teamA!.id) : [],
      teamBAthleteIds: m.teamB ? m.teamB.members.map((mem) => mem.userId || m.teamB!.id) : [],
    }));

    const courtInputs: ScheduleCourtInput[] = tournament.courts.map((c) => ({
      id: c.id,
      name: c.name,
      courtOrder: c.courtOrder,
    }));

    const { updatedMatches, unresolvedConflicts } = this.engine.recalculateOverrun(
      dto.delayedMatchId,
      new Date(dto.actualEndTime),
      matchInputs,
      courtInputs,
      tournament.matchIntervalMinutes,
      20,
    );

    // Apply shifts in transaction
    if (updatedMatches.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of updatedMatches) {
          await tx.match.update({
            where: { id: item.id },
            data: { scheduledStartTime: item.scheduledStartTime },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: operatorUserId,
            tournamentId: tournament.id,
            action: 'SCHEDULE_RECALCULATED_OVERRUN',
            entityType: 'TOURNAMENT',
            entityId: tournament.id,
            newValue: {
              delayedMatchCode: delayedMatch.matchCode,
              shiftedMatchesCount: updatedMatches.length,
            },
          },
        });
      });
    }

    return {
      updatedMatches,
      unresolvedConflicts,
      message:
        unresolvedConflicts.length > 0
          ? `Đã dịch chuyển ${updatedMatches.length} trận nhưng có ${unresolvedConflicts.length} xung đột cần giải quyết thủ công.`
          : `Đã tự động dịch chuyển ${updatedMatches.length} trận đấu an toàn.`,
    };
  }

  async publishSchedule(tournamentId: string, operatorUserId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    // Run conflict check
    const schedule = await this.getTournamentSchedule(tournamentId);
    const blockingErrors = schedule.conflicts.filter((c) => c.severity === 'ERROR');

    if (blockingErrors.length > 0) {
      throw new BadRequestException(
        `Không thể công bố lịch: Còn ${blockingErrors.length} lỗi xung đột nghiêm trọng (trùng sân, trùng VĐV). Vui lòng khắc phục trước khi công bố.`,
      );
    }

    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.SCHEDULE_PUBLISHED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId,
        action: 'SCHEDULE_PUBLISHED',
        entityType: 'TOURNAMENT',
        entityId: tournamentId,
        newValue: { status: TournamentStatus.SCHEDULE_PUBLISHED },
      },
    });

    return updated;
  }
}

