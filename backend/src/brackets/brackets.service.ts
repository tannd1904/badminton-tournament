import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TournamentEngineService,
  ParticipantCandidate,
} from './tournament-engine.service';
import {
  StageType,
  StageStatus,
  MatchStatus,
  NextMatchSlot,
  EventStatus,
} from '@prisma/client';

@Injectable()
export class BracketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: TournamentEngineService,
  ) {}

  async previewDraw(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tournament: true,
        participants: {
          where: { registrationStatus: 'APPROVED' },
          include: { club: true },
          orderBy: [
            { isSeeded: 'desc' },
            { seedNumber: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Nội dung thi đấu không tồn tại');
    }

    if (event.participants.length < 2) {
      throw new BadRequestException(
        `Nội dung cần tối thiểu 2 VĐV đã được duyệt để bốc thăm (Hiện có: ${event.participants.length})`,
      );
    }

    const candidates: ParticipantCandidate[] = event.participants.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      clubId: p.clubId,
      clubName: p.club?.name || null,
      isSeeded: p.isSeeded,
      seedNumber: p.seedNumber,
    }));

    if (event.format === 'KNOCKOUT') {
      return this.engine.generateKnockoutBracket(candidates, event.name.substring(0, 3).toUpperCase());
    } else {
      return this.engine.generateRoundRobinSchedule(candidates, event.name.substring(0, 3).toUpperCase());
    }
  }

  async confirmDraw(eventId: string, operatorUserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tournament: true,
        stages: {
          include: { matches: true },
        },
        participants: {
          where: { registrationStatus: 'APPROVED' },
          include: { club: true },
          orderBy: [
            { isSeeded: 'desc' },
            { seedNumber: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Nội dung thi đấu không tồn tại');
    }

    if (event.participants.length < 2) {
      throw new BadRequestException('Nội dung cần tối thiểu 2 VĐV đã duyệt');
    }

    // Check if matches have already started
    const hasStartedMatches = event.stages.some((s) =>
      s.matches.some((m) => m.status === 'IN_PROGRESS' || m.status === 'COMPLETED'),
    );
    if (hasStartedMatches) {
      throw new BadRequestException('Giải đấu đã diễn ra, không thể bốc thăm lại');
    }

    const candidates: ParticipantCandidate[] = event.participants.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      clubId: p.clubId,
      clubName: p.club?.name || null,
      isSeeded: p.isSeeded,
      seedNumber: p.seedNumber,
    }));

    if (event.format === 'KNOCKOUT') {
      return this.commitKnockoutDraw(event, candidates, operatorUserId);
    } else {
      return this.commitRoundRobinDraw(event, candidates, operatorUserId);
    }
  }

  private async commitKnockoutDraw(
    event: any,
    candidates: ParticipantCandidate[],
    operatorUserId: string,
  ) {
    const preview = this.engine.generateKnockoutBracket(candidates, event.name.substring(0, 3).toUpperCase());
    const K = preview.bracketSize;
    const totalRounds = preview.totalRounds;

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete old stages/matches if draft
      await tx.match.deleteMany({ where: { eventId: event.id } });
      await tx.stage.deleteMany({ where: { eventId: event.id } });

      // 2. Create Knockout Stage
      const stage = await tx.stage.create({
        data: {
          eventId: event.id,
          name: 'Vòng Đấu Loại Trực Tiếp',
          stageOrder: 1,
          stageType: StageType.KNOCKOUT_STAGE,
          status: StageStatus.IN_PROGRESS,
        },
      });

      // 3. Create all matches from Final backwards to Round 1 so we have nextMatchId references!
      // In a binary tree of size K:
      // Round totalRounds has 1 match (Final).
      // Round r has 2^(totalRounds - r) matches.
      const roundMatchesMap = new Map<number, any[]>(); // roundNumber -> matches created

      for (let r = totalRounds; r >= 1; r--) {
        const matchesInThisRound = K / Math.pow(2, r);
        const roundName = this.engine.getRoundName(matchesInThisRound);
        const createdMatchesInRound: any[] = [];

        for (let m = 0; m < matchesInThisRound; m++) {
          const matchIndex = m + 1;
          const matchCode = `${event.name.substring(0, 2).toUpperCase()}-R${r}-M${matchIndex}`;

          let nextMatchId: string | null = null;
          let nextMatchSlot: NextMatchSlot | null = null;

          if (r < totalRounds) {
            // Next round match is at round r + 1, index Math.floor(m / 2)
            const parentMatches = roundMatchesMap.get(r + 1);
            if (parentMatches) {
              const parentMatch = parentMatches[Math.floor(m / 2)];
              nextMatchId = parentMatch.id;
              nextMatchSlot = m % 2 === 0 ? NextMatchSlot.TEAM_A : NextMatchSlot.TEAM_B;
            }
          }

          // If Round 1, populate initial teams from preview.slots!
          let teamAId: string | null = null;
          let teamBId: string | null = null;
          let status: MatchStatus = MatchStatus.SCHEDULED;
          let winnerId: string | null = null;

          if (r === 1) {
            const slotA = preview.slots[m * 2];
            const slotB = preview.slots[m * 2 + 1];

            teamAId = slotA.participant ? slotA.participant.id : null;
            teamBId = slotB.participant ? slotB.participant.id : null;

            // Handle Bye automatic promotion
            if (slotB.isBye && teamAId) {
              status = MatchStatus.COMPLETED;
              winnerId = teamAId;
            } else if (slotA.isBye && teamBId) {
              status = MatchStatus.COMPLETED;
              winnerId = teamBId;
            }
          }

          const match = await tx.match.create({
            data: {
              eventId: event.id,
              stageId: stage.id,
              matchCode,
              roundName,
              roundNumber: r,
              bracketPosition: matchIndex,
              teamAId,
              teamBId,
              status,
              winnerId,
              nextMatchId,
              nextMatchSlot,
            },
          });

          // Create standard initial match set (Set 1)
          await tx.matchSet.create({
            data: {
              matchId: match.id,
              setNumber: 1,
              scoreTeamA: 0,
              scoreTeamB: 0,
            },
          });

          createdMatchesInRound.push(match);
        }

        roundMatchesMap.set(r, createdMatchesInRound);
      }

      // Propagate Bye winners to Round 2 immediately!
      const round1Matches = roundMatchesMap.get(1) || [];
      const round2Matches = roundMatchesMap.get(2) || [];

      for (const m1 of round1Matches) {
        if (m1.winnerId && m1.nextMatchId && m1.nextMatchSlot) {
          await tx.match.update({
            where: { id: m1.nextMatchId },
            data: {
              [m1.nextMatchSlot === NextMatchSlot.TEAM_A ? 'teamAId' : 'teamBId']: m1.winnerId,
            },
          });
        }
      }

      // Update Event status
      await tx.event.update({
        where: { id: event.id },
        data: { status: EventStatus.DRAWN },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: operatorUserId,
          tournamentId: event.tournamentId,
          action: 'DRAW_CONFIRMED',
          entityType: 'EVENT',
          entityId: event.id,
          newValue: { format: 'KNOCKOUT', bracketSize: K, totalMatches: K - 1 },
        },
      });

      return {
        success: true,
        message: 'Bốc thăm phân nhánh Knockout thành công',
        bracketSize: K,
        totalRounds,
      };
    });
  }

  private async commitRoundRobinDraw(
    event: any,
    candidates: ParticipantCandidate[],
    operatorUserId: string,
  ) {
    const preview = this.engine.generateRoundRobinSchedule(candidates, event.name.substring(0, 3).toUpperCase());

    return this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { eventId: event.id } });
      await tx.stage.deleteMany({ where: { eventId: event.id } });

      const stage = await tx.stage.create({
        data: {
          eventId: event.id,
          name: 'Vòng Bảng (Round Robin)',
          stageOrder: 1,
          stageType: StageType.GROUP_STAGE,
          status: StageStatus.IN_PROGRESS,
        },
      });

      const group = await tx.group.create({
        data: {
          stageId: stage.id,
          name: 'Bảng Đấu Duy Nhất',
          groupOrder: 1,
        },
      });

      // Add group participants
      for (const p of candidates) {
        await tx.groupParticipant.create({
          data: {
            groupId: group.id,
            participantId: p.id,
          },
        });
      }

      // Create matches
      for (const round of preview.rounds) {
        for (let m = 0; m < round.matches.length; m++) {
          const matchItem = round.matches[m];

          const match = await tx.match.create({
            data: {
              eventId: event.id,
              stageId: stage.id,
              groupId: group.id,
              matchCode: matchItem.matchCode,
              roundName: `Lượt ${round.roundNumber}`,
              roundNumber: round.roundNumber,
              bracketPosition: m + 1,
              teamAId: matchItem.teamA.id,
              teamBId: matchItem.teamB.id,
              status: MatchStatus.SCHEDULED,
            },
          });

          await tx.matchSet.create({
            data: {
              matchId: match.id,
              setNumber: 1,
              scoreTeamA: 0,
              scoreTeamB: 0,
            },
          });
        }
      }

      await tx.event.update({
        where: { id: event.id },
        data: { status: EventStatus.DRAWN },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorUserId,
          tournamentId: event.tournamentId,
          action: 'DRAW_CONFIRMED',
          entityType: 'EVENT',
          entityId: event.id,
          newValue: { format: 'ROUND_ROBIN', totalRounds: preview.totalRounds, totalMatches: preview.totalMatches },
        },
      });

      return {
        success: true,
        message: 'Bốc thăm bảng đấu Vòng Tròn thành công',
        totalRounds: preview.totalRounds,
        totalMatches: preview.totalMatches,
      };
    });
  }

  async getBracketTree(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        matches: {
          include: {
            teamA: { include: { club: true } },
            teamB: { include: { club: true } },
            winner: true,
            sets: { orderBy: { setNumber: 'asc' } },
            court: true,
          },
          orderBy: [
            { roundNumber: 'asc' },
            { bracketPosition: 'asc' },
          ],
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Nội dung không tồn tại');
    }

    // Group matches by roundNumber
    const roundsMap = new Map<number, any[]>();
    for (const m of event.matches) {
      if (!roundsMap.has(m.roundNumber)) {
        roundsMap.set(m.roundNumber, []);
      }
      roundsMap.get(m.roundNumber)!.push(m);
    }

    const rounds = Array.from(roundsMap.entries()).map(([roundNumber, matches]) => ({
      roundNumber,
      roundName: matches[0]?.roundName || `Vòng ${roundNumber}`,
      matches,
    }));

    return {
      eventId,
      eventName: event.name,
      format: event.format,
      rounds,
    };
  }
}

