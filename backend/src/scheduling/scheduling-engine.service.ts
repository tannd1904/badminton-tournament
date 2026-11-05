import { Injectable, Logger } from '@nestjs/common';

export interface ScheduleAthlete {
  id: string;
  fullName: string;
}

export interface ScheduleMatchInput {
  id: string;
  matchCode: string;
  roundNumber: number;
  bracketPosition?: number | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamAAthleteIds: string[];
  teamBAthleteIds: string[];
  scheduledStartTime?: Date | null;
  estimatedDurationMinutes: number;
  courtId?: string | null;
  isTimeLocked: boolean;
  refereeUserId?: string | null;
  priorMatchIds?: string[]; // Matches that must complete before this one
}

export interface ScheduleCourtInput {
  id: string;
  name: string;
  courtOrder: number;
}

export interface ScheduleConflict {
  type: 'COURT_OVERLAP' | 'ATHLETE_OVERLAP' | 'INSUFFICIENT_REST' | 'REFEREE_OVERLAP' | 'PRECEDENCE_VIOLATION' | 'LOCK_TIME_VIOLATION';
  severity: 'ERROR' | 'WARNING';
  matchId: string;
  matchCode: string;
  conflictingMatchId?: string;
  conflictingMatchCode?: string;
  description: string;
}

export interface ScheduledMatchResult {
  id: string;
  matchCode: string;
  courtId: string;
  scheduledStartTime: Date;
  estimatedDurationMinutes: number;
  isTimeLocked: boolean;
}

@Injectable()
export class SchedulingEngineService {
  private readonly logger = new Logger(SchedulingEngineService.name);

  /**
   * Validates a set of matches against scheduling rules and returns all detected conflicts
   */
  detectConflicts(
    matches: ScheduleMatchInput[],
    restIntervalMinutes: number = 20,
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    // Filter matches that have a scheduled start time and court
    const scheduledMatches = matches.filter(
      (m) => m.scheduledStartTime && m.courtId,
    );

    for (let i = 0; i < scheduledMatches.length; i++) {
      const m1 = scheduledMatches[i];
      const start1 = new Date(m1.scheduledStartTime!).getTime();
      const end1 = start1 + m1.estimatedDurationMinutes * 60 * 1000;
      const athletes1 = new Set([...m1.teamAAthleteIds, ...m1.teamBAthleteIds]);

      for (let j = i + 1; j < scheduledMatches.length; j++) {
        const m2 = scheduledMatches[j];
        const start2 = new Date(m2.scheduledStartTime!).getTime();
        const end2 = start2 + m2.estimatedDurationMinutes * 60 * 1000;
        const athletes2 = new Set([...m2.teamAAthleteIds, ...m2.teamBAthleteIds]);

        // 1. Court Overlap Check
        if (m1.courtId === m2.courtId) {
          const isOverlapping = !(end1 <= start2 || end2 <= start1);
          if (isOverlapping) {
            conflicts.push({
              type: 'COURT_OVERLAP',
              severity: 'ERROR',
              matchId: m1.id,
              matchCode: m1.matchCode,
              conflictingMatchId: m2.id,
              conflictingMatchCode: m2.matchCode,
              description: `Sân thi đấu bị trùng giờ giữa ${m1.matchCode} và ${m2.matchCode}`,
            });
          }
        }

        // 2. Athlete Overlap & Rest Buffer Check
        const sharedAthletes = [...athletes1].filter((a) => athletes2.has(a));
        if (sharedAthletes.length > 0) {
          // Direct overlap
          const isDirectOverlap = !(end1 <= start2 || end2 <= start1);
          if (isDirectOverlap) {
            conflicts.push({
              type: 'ATHLETE_OVERLAP',
              severity: 'ERROR',
              matchId: m1.id,
              matchCode: m1.matchCode,
              conflictingMatchId: m2.id,
              conflictingMatchCode: m2.matchCode,
              description: `Vận động viên thi đấu 2 trận cùng lúc (${m1.matchCode} và ${m2.matchCode})`,
            });
          } else {
            // Check rest interval
            const bufferMs = restIntervalMinutes * 60 * 1000;
            const diff1 = start2 - end1; // m1 ends before m2 starts
            const diff2 = start1 - end2; // m2 ends before m1 starts

            if (diff1 >= 0 && diff1 < bufferMs) {
              conflicts.push({
                type: 'INSUFFICIENT_REST',
                severity: 'WARNING',
                matchId: m2.id,
                matchCode: m2.matchCode,
                conflictingMatchId: m1.id,
                conflictingMatchCode: m1.matchCode,
                description: `VĐV chỉ có ${Math.round(diff1 / 60000)} phút nghỉ giữa ${m1.matchCode} và ${m2.matchCode} (Yêu cầu: ${restIntervalMinutes} phút)`,
              });
            } else if (diff2 >= 0 && diff2 < bufferMs) {
              conflicts.push({
                type: 'INSUFFICIENT_REST',
                severity: 'WARNING',
                matchId: m1.id,
                matchCode: m1.matchCode,
                conflictingMatchId: m2.id,
                conflictingMatchCode: m2.matchCode,
                description: `VĐV chỉ có ${Math.round(diff2 / 60000)} phút nghỉ giữa ${m2.matchCode} và ${m1.matchCode} (Yêu cầu: ${restIntervalMinutes} phút)`,
              });
            }
          }
        }

        // 3. Referee Overlap Check
        if (
          m1.refereeUserId &&
          m2.refereeUserId &&
          m1.refereeUserId === m2.refereeUserId
        ) {
          const isRefOverlap = !(end1 <= start2 || end2 <= start1);
          if (isRefOverlap) {
            conflicts.push({
              type: 'REFEREE_OVERLAP',
              severity: 'ERROR',
              matchId: m1.id,
              matchCode: m1.matchCode,
              conflictingMatchId: m2.id,
              conflictingMatchCode: m2.matchCode,
              description: `Trọng tài được phân công điều hành 2 trận trùng giờ (${m1.matchCode} và ${m2.matchCode})`,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Generates court schedule automatically using priority heuristics:
   * 1. Preserves locked matches at their exact times.
   * 2. Sorts unlocked matches by precedence (Round 1 first, then Round 2, etc.).
   * 3. Allocates each match to the earliest available court that respects athlete rest constraints.
   */
  generateAutoSchedule(
    matches: ScheduleMatchInput[],
    courts: ScheduleCourtInput[],
    startTime: Date,
    defaultDurationMinutes: number = 35,
    matchIntervalMinutes: number = 15,
    athleteRestMinutes: number = 20,
  ): ScheduledMatchResult[] {
    if (courts.length === 0) {
      throw new Error('Cần có ít nhất 1 sân thi đấu để xếp lịch');
    }

    // Sort courts by courtOrder
    const sortedCourts = [...courts].sort((a, b) => a.courtOrder - b.courtOrder);

    // Track court timeline: courtId -> earliest free timestamp
    const courtFreeTimes = new Map<string, number>();
    for (const c of sortedCourts) {
      courtFreeTimes.set(c.id, startTime.getTime());
    }

    // Track athlete timeline: athleteId -> earliest free timestamp (with rest interval)
    const athleteFreeTimes = new Map<string, number>();

    // Separate locked matches from unlocked matches
    const lockedMatches = matches.filter(
      (m) => m.isTimeLocked && m.scheduledStartTime && m.courtId,
    );
    const unlockedMatches = matches.filter((m) => !m.isTimeLocked);

    // Initialize locked matches on timeline
    const results: ScheduledMatchResult[] = [];
    for (const lm of lockedMatches) {
      const start = new Date(lm.scheduledStartTime!).getTime();
      const end = start + lm.estimatedDurationMinutes * 60 * 1000;
      results.push({
        id: lm.id,
        matchCode: lm.matchCode,
        courtId: lm.courtId!,
        scheduledStartTime: new Date(start),
        estimatedDurationMinutes: lm.estimatedDurationMinutes,
        isTimeLocked: true,
      });

      // Update athlete free times
      const allAthletes = [...lm.teamAAthleteIds, ...lm.teamBAthleteIds];
      const athleteAvailableAt = end + athleteRestMinutes * 60 * 1000;
      for (const aId of allAthletes) {
        const cur = athleteFreeTimes.get(aId) || 0;
        athleteFreeTimes.set(aId, Math.max(cur, athleteAvailableAt));
      }
    }

    // Sort unlocked matches by roundNumber ascending, then bracketPosition
    unlockedMatches.sort((a, b) => {
      if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
      return (a.bracketPosition || 0) - (b.bracketPosition || 0);
    });

    const stepMs = 5 * 60 * 1000; // 5 minute search increments

    for (const match of unlockedMatches) {
      const durationMs = (match.estimatedDurationMinutes || defaultDurationMinutes) * 60 * 1000;
      const allAthletes = [...match.teamAAthleteIds, ...match.teamBAthleteIds];

      // Earliest time athletes can play
      let minAthleteTime = startTime.getTime();
      for (const aId of allAthletes) {
        const freeAt = athleteFreeTimes.get(aId) || 0;
        if (freeAt > minAthleteTime) {
          minAthleteTime = freeAt;
        }
      }

      // Find best (earliest) available court slot
      let bestCourtId: string = sortedCourts[0].id;
      let bestStartTime: number = Infinity;

      for (const court of sortedCourts) {
        let candidateStart = Math.max(courtFreeTimes.get(court.id) || 0, minAthleteTime);

        // Check for collision with locked matches on this court
        let hasCollision = true;
        let searchAttempts = 0;

        while (hasCollision && searchAttempts < 200) {
          searchAttempts++;
          const candidateEnd = candidateStart + durationMs;

          // Check if candidateStart conflicts with any locked match on this court
          const conflictsWithLocked = lockedMatches.some((lm) => {
            if (lm.courtId !== court.id) return false;
            const lStart = new Date(lm.scheduledStartTime!).getTime();
            const lEnd = lStart + lm.estimatedDurationMinutes * 60 * 1000;
            return !(candidateEnd <= lStart || candidateStart >= lEnd);
          });

          if (conflictsWithLocked) {
            candidateStart += stepMs;
          } else {
            hasCollision = false;
          }
        }

        if (candidateStart < bestStartTime) {
          bestStartTime = candidateStart;
          bestCourtId = court.id;
        }
      }

      // Assign to best court
      const assignedStart = new Date(bestStartTime);
      const matchEnd = bestStartTime + durationMs;

      results.push({
        id: match.id,
        matchCode: match.matchCode,
        courtId: bestCourtId,
        scheduledStartTime: assignedStart,
        estimatedDurationMinutes: match.estimatedDurationMinutes || defaultDurationMinutes,
        isTimeLocked: false,
      });

      // Update court free time (including matchInterval)
      const courtAvailableAt = matchEnd + matchIntervalMinutes * 60 * 1000;
      courtFreeTimes.set(bestCourtId, courtAvailableAt);

      // Update athlete free times
      const athleteAvailableAt = matchEnd + athleteRestMinutes * 60 * 1000;
      for (const aId of allAthletes) {
        athleteFreeTimes.set(aId, athleteAvailableAt);
      }
    }

    return results;
  }

  /**
   * Recalculates schedule when a match overruns, cascading delays while respecting isTimeLocked
   */
  recalculateOverrun(
    delayedMatchId: string,
    actualEndTime: Date,
    allMatches: ScheduleMatchInput[],
    courts: ScheduleCourtInput[],
    matchIntervalMinutes: number = 15,
    restIntervalMinutes: number = 20,
  ): {
    updatedMatches: ScheduledMatchResult[];
    unresolvedConflicts: ScheduleConflict[];
  } {
    const delayedMatch = allMatches.find((m) => m.id === delayedMatchId);
    if (!delayedMatch || !delayedMatch.courtId) {
      throw new Error('Không tìm thấy thông tin trận đấu bị trễ');
    }

    const courtId = delayedMatch.courtId;
    const newCourtFreeTime = actualEndTime.getTime() + matchIntervalMinutes * 60 * 1000;

    // Downstream matches on the same court that were scheduled to start before newCourtFreeTime
    const downstreamMatches = allMatches
      .filter(
        (m) =>
          m.id !== delayedMatchId &&
          m.courtId === courtId &&
          m.scheduledStartTime &&
          new Date(m.scheduledStartTime).getTime() < newCourtFreeTime,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledStartTime!).getTime() -
          new Date(b.scheduledStartTime!).getTime(),
      );

    const updatedMatches: ScheduledMatchResult[] = [];
    const conflicts: ScheduleConflict[] = [];

    let currentTimeline = newCourtFreeTime;

    for (const match of downstreamMatches) {
      if (match.isTimeLocked) {
        // Cannot shift locked match -> Flag critical conflict!
        conflicts.push({
          type: 'LOCK_TIME_VIOLATION',
          severity: 'ERROR',
          matchId: match.id,
          matchCode: match.matchCode,
          conflictingMatchId: delayedMatch.id,
          conflictingMatchCode: delayedMatch.matchCode,
          description: `Trận ${match.matchCode} đã bị khóa giờ nhưng trận ${delayedMatch.matchCode} kéo dài lấn vào mốc giờ khóa. Cần chuyển sân thủ công.`,
        });
        continue;
      }

      // Shift unlocked match
      const newStart = new Date(currentTimeline);
      updatedMatches.push({
        id: match.id,
        matchCode: match.matchCode,
        courtId: match.courtId!,
        scheduledStartTime: newStart,
        estimatedDurationMinutes: match.estimatedDurationMinutes,
        isTimeLocked: false,
      });

      currentTimeline +=
        (match.estimatedDurationMinutes + matchIntervalMinutes) * 60 * 1000;
    }

    return {
      updatedMatches,
      unresolvedConflicts: conflicts,
    };
  }
}

