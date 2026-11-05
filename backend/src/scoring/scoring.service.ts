import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringEngineService,
  TeamSide,
  CurrentSetState,
} from './scoring-engine.service';
import {
  RecordPointDto,
  WalkoverDto,
  StartMatchDto,
  TeamSideEnum,
} from './dto/scoring.dto';
import { MatchStatus, ScoreEventType, NextMatchSlot } from '@prisma/client';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ScoringEngineService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Get full live score state of a match
   */
  async getMatchScore(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            playType: true,
            tournamentId: true,
            tournament: { select: { id: true, name: true } },
          },
        },
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
        sets: { orderBy: { setNumber: 'asc' } },
        scoreEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    const completedSets = match.sets
      .filter((s) => s.completedAt !== null && s.winningTeamId !== null)
      .map((s) => ({
        setNumber: s.setNumber,
        scoreTeamA: s.scoreTeamA,
        scoreTeamB: s.scoreTeamB,
        winnerId: s.winningTeamId,
        winner:
          s.winningTeamId === match.teamAId
            ? ('TEAM_A' as TeamSide)
            : ('TEAM_B' as TeamSide),
      }));

    const setsWonA = completedSets.filter((s) => s.winner === 'TEAM_A').length;
    const setsWonB = completedSets.filter((s) => s.winner === 'TEAM_B').length;

    // Active (current) set is either the latest uncompleted set or a newly initialized set 1
    const activeSet = match.sets.find((s) => s.completedAt === null) || match.sets[match.sets.length - 1];

    return {
      matchId: match.id,
      matchCode: match.matchCode,
      status: match.status,
      event: match.event,
      court: match.court,
      referee: match.referee,
      teamA: match.teamA,
      teamB: match.teamB,
      winner: match.winner,
      actualStartTime: match.actualStartTime,
      actualEndTime: match.actualEndTime,
      setsWonTeamA: setsWonA,
      setsWonTeamB: setsWonB,
      completedSets,
      activeSet: activeSet || null,
      recentEvents: match.scoreEvents,
    };
  }

  /**
   * Start a match (referee begins match)
   */
  async startMatch(
    matchId: string,
    dto: StartMatchDto,
    refereeUserId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { sets: true },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    if (match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Trận đấu đã hoàn thành');
    }

    const servingTeam = dto.initialServingTeam || TeamSideEnum.TEAM_A;

    return this.prisma.$transaction(async (tx) => {
      // Update match to IN_PROGRESS
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.IN_PROGRESS,
          actualStartTime: match.actualStartTime || new Date(),
          refereeUserId,
        },
      });

      // Ensure Set 1 exists
      let set1 = match.sets.find((s) => s.setNumber === 1);
      if (!set1) {
        set1 = await tx.matchSet.create({
          data: {
            matchId,
            setNumber: 1,
            scoreTeamA: 0,
            scoreTeamB: 0,
            servingTeam,
          },
        });
      }

      await tx.matchScoreEvent.create({
        data: {
          matchId,
          setNumber: 1,
          eventType: ScoreEventType.SERVING_TEAM_CHANGED,
          servingTeam,
          scoreTeamA: set1.scoreTeamA,
          scoreTeamB: set1.scoreTeamB,
          createdBy: refereeUserId,
          idempotencyKey: `start-${matchId}-${Date.now()}`,
        },
      });

      const result = {
        match: updatedMatch,
        activeSet: set1,
      };

      this.realtime.notifyScoreUpdate(matchId, undefined, result);
      return result;
    });
  }

  /**
   * Record a point for Team A or Team B
   */
  async recordPoint(
    matchId: string,
    dto: RecordPointDto,
    refereeUserId: string,
  ) {
    // Check idempotency first
    const existingEvent = await this.prisma.matchScoreEvent.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingEvent) {
      const currentScore = await this.getMatchScore(matchId);
      return {
        success: true,
        alreadyProcessed: true,
        calculation: null,
        activeSet: currentScore.activeSet,
      };
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sets: { orderBy: { setNumber: 'asc' } },
        teamA: true,
        teamB: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException('Trận đấu chưa bắt đầu hoặc đã kết thúc');
    }

    if (!match.teamAId || !match.teamBId) {
      throw new BadRequestException('Trận đấu chưa có đủ 2 đội');
    }

    // Get current active set
    let activeSet = match.sets.find((s) => s.completedAt === null);

    if (!activeSet) {
      // Determine what set number we should be on
      const nextSetNumber = match.sets.length + 1;
      if (nextSetNumber > 3) {
        throw new BadRequestException('Trận đấu đã đủ 3 set');
      }

      activeSet = await this.prisma.matchSet.create({
        data: {
          matchId,
          setNumber: nextSetNumber,
          scoreTeamA: 0,
          scoreTeamB: 0,
          servingTeam: dto.team,
        },
      });
    }

    // Count completed sets won
    const setsWonA = match.sets.filter(
      (s) => s.completedAt !== null && s.winningTeamId === match.teamAId,
    ).length;
    const setsWonB = match.sets.filter(
      (s) => s.completedAt !== null && s.winningTeamId === match.teamBId,
    ).length;

    // Run pure calculation in scoring engine
    const currentState: CurrentSetState = {
      setNumber: activeSet.setNumber,
      scoreTeamA: activeSet.scoreTeamA,
      scoreTeamB: activeSet.scoreTeamB,
      servingTeam: (activeSet.servingTeam as TeamSide) || 'TEAM_A',
    };

    const calc = this.engine.calculatePoint(
      currentState,
      dto.team as TeamSide,
      setsWonA,
      setsWonB,
    );

    // Save state transactionally
    return this.prisma.$transaction(async (tx) => {
      // 1. Create score event
      await tx.matchScoreEvent.create({
        data: {
          matchId,
          setNumber: activeSet!.setNumber,
          eventType: calc.isMatchWon
            ? ScoreEventType.MATCH_COMPLETED
            : calc.isSetWon
            ? ScoreEventType.SET_COMPLETED
            : ScoreEventType.POINT_ADDED,
          team: dto.team,
          pointsDelta: 1,
          scoreTeamA: calc.newScoreTeamA,
          scoreTeamB: calc.newScoreTeamB,
          servingTeam: calc.servingTeam,
          createdBy: refereeUserId,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // 2. Update current active set
      const winningParticipantId =
        calc.setWinner === 'TEAM_A' ? match.teamAId : match.teamBId;

      const updatedSet = await tx.matchSet.update({
        where: { id: activeSet!.id },
        data: {
          scoreTeamA: calc.newScoreTeamA,
          scoreTeamB: calc.newScoreTeamB,
          servingTeam: calc.servingTeam,
          completedAt: calc.isSetWon ? new Date() : null,
          winningTeamId: calc.isSetWon ? winningParticipantId : null,
        },
      });

      // 3. Handle Match Won or Set Won
      if (calc.isMatchWon && calc.matchWinner) {
        const matchWinnerId =
          calc.matchWinner === 'TEAM_A' ? match.teamAId : match.teamBId;

        await this.finalizeMatchCompletion(tx, match, matchWinnerId!, refereeUserId);
      } else if (calc.isSetWon && activeSet!.setNumber < 3) {
        // Automatically initialize next set (Set 2 or Set 3)
        // Winner of previous set serves first
        await tx.matchSet.create({
          data: {
            matchId,
            setNumber: activeSet!.setNumber + 1,
            scoreTeamA: 0,
            scoreTeamB: 0,
            servingTeam: calc.setWinner || 'TEAM_A',
          },
        });
      }

      const result = {
        success: true,
        calculation: calc,
        activeSet: updatedSet,
      };

      this.realtime.notifyScoreUpdate(matchId, undefined, result);
      return result;
    });
  }

  /**
   * Undo last score event transactionally
   */
  async undoLastPoint(matchId: string, refereeUserId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sets: { orderBy: { setNumber: 'desc' } },
        scoreEvents: { orderBy: { createdAt: 'desc' }, take: 2 },
      },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    if (match.scoreEvents.length === 0) {
      throw new BadRequestException('Không có điểm số nào để hoàn tác');
    }

    const latestEvent = match.scoreEvents[0];
    const previousEvent = match.scoreEvents[1]; // might be undefined if undoing first point

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete latest score event
      await tx.matchScoreEvent.delete({
        where: { id: latestEvent.id },
      });

      // 2. If match was COMPLETED, revert back to IN_PROGRESS and remove winner from nextMatch
      if (match.status === MatchStatus.COMPLETED) {
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: MatchStatus.IN_PROGRESS,
            winnerId: null,
            actualEndTime: null,
          },
        });

        // Revert next match bracket advancement if any
        if (match.nextMatchId && match.nextMatchSlot) {
          const slotField =
            match.nextMatchSlot === NextMatchSlot.TEAM_A ? 'teamAId' : 'teamBId';
          await tx.match.update({
            where: { id: match.nextMatchId },
            data: {
              [slotField]: null,
              status: MatchStatus.SCHEDULED,
            },
          });
        }
      }

      // 3. Find current active set or latest set
      let targetSet = match.sets.find((s) => s.setNumber === latestEvent.setNumber);

      if (targetSet) {
        // If an extra set was created after a set win and is empty (0-0), clean it up
        const higherEmptySets = match.sets.filter(
          (s) =>
            s.setNumber > latestEvent.setNumber &&
            s.scoreTeamA === 0 &&
            s.scoreTeamB === 0 &&
            s.completedAt === null,
        );

        for (const emptySet of higherEmptySets) {
          await tx.matchSet.delete({ where: { id: emptySet.id } });
        }

        // Restore target set scores
        const prevScoreA = previousEvent ? previousEvent.scoreTeamA : 0;
        const prevScoreB = previousEvent ? previousEvent.scoreTeamB : 0;
        const prevServingTeam = previousEvent ? previousEvent.servingTeam : 'TEAM_A';

        await tx.matchSet.update({
          where: { id: targetSet.id },
          data: {
            scoreTeamA: prevScoreA,
            scoreTeamB: prevScoreB,
            servingTeam: prevServingTeam,
            completedAt: null,
            winningTeamId: null,
          },
        });
      }

      // Audit log the undo
      await tx.auditLog.create({
        data: {
          userId: refereeUserId,
          action: 'MATCH_SCORE_UNDONE',
          entityType: 'MATCH',
          entityId: matchId,
          oldValue: {
            scoreTeamA: latestEvent.scoreTeamA,
            scoreTeamB: latestEvent.scoreTeamB,
          },
        },
      });

      const result = {
        success: true,
        message: 'Hoàn tác điểm số thành công',
      };

      this.realtime.notifyScoreUpdate(matchId, undefined, result);
      return result;
    });
  }

  /**
   * Record Walkover (opponent forfeits or no-show)
   */
  async walkoverMatch(
    matchId: string,
    dto: WalkoverDto,
    refereeUserId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { sets: true },
    });

    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }

    if (match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Trận đấu đã hoàn thành');
    }

    const winnerId = dto.winnerTeam === TeamSideEnum.TEAM_A ? match.teamAId : match.teamBId;

    if (!winnerId) {
      throw new BadRequestException('Không tìm thấy thông tin đội thắng');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create Walkover score event
      await tx.matchScoreEvent.create({
        data: {
          matchId,
          setNumber: match.sets.length > 0 ? match.sets[match.sets.length - 1].setNumber : 1,
          eventType: ScoreEventType.MATCH_COMPLETED,
          team: dto.winnerTeam,
          scoreTeamA: 21,
          scoreTeamB: 0,
          createdBy: refereeUserId,
          idempotencyKey: `walkover-${matchId}-${Date.now()}`,
        },
      });

      // Finalize match as WALKOVER
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.WALKOVER,
          winnerId,
          actualEndTime: new Date(),
        },
      });

      // Advance winner to next round
      await this.advanceWinnerToNextMatch(tx, match, winnerId);

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: refereeUserId,
          action: 'MATCH_WALKOVER_RECORDED',
          entityType: 'MATCH',
          entityId: matchId,
          newValue: { winnerId, reason: dto.reason },
        },
      });

      const result = {
        success: true,
        message: 'Ghi nhận xử thua (Walkover) thành công',
      };

      this.realtime.notifyMatchCompleted(matchId, undefined, {
        matchId,
        winnerId,
        status: MatchStatus.WALKOVER,
      });

      return result;
    });
  }

  /**
   * Helper: Finalize Match Completion and advance winner
   */
  private async finalizeMatchCompletion(
    tx: any,
    match: any,
    winnerId: string,
    refereeUserId: string,
  ) {
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: MatchStatus.COMPLETED,
        winnerId,
        actualEndTime: new Date(),
      },
    });

    await this.advanceWinnerToNextMatch(tx, match, winnerId);

    await tx.auditLog.create({
      data: {
        userId: refereeUserId,
        action: 'MATCH_COMPLETED',
        entityType: 'MATCH',
        entityId: match.id,
        newValue: { winnerId },
      },
    });

    this.realtime.notifyMatchCompleted(match.id, undefined, {
      matchId: match.id,
      winnerId,
      status: MatchStatus.COMPLETED,
    });
  }

  /**
   * Helper: Advance winner to next round in knockout bracket
   */
  private async advanceWinnerToNextMatch(
    tx: any,
    match: any,
    winnerId: string,
  ) {
    if (!match.nextMatchId || !match.nextMatchSlot) {
      return;
    }

    const slotField =
      match.nextMatchSlot === NextMatchSlot.TEAM_A ? 'teamAId' : 'teamBId';

    // Populate winner into next match slot
    const updatedNextMatch = await tx.match.update({
      where: { id: match.nextMatchId },
      data: {
        [slotField]: winnerId,
      },
    });

    // If next match now has both opponents populated, set status to READY
    if (updatedNextMatch.teamAId && updatedNextMatch.teamBId) {
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: {
          status: MatchStatus.READY,
        },
      });
    }
  }
}
