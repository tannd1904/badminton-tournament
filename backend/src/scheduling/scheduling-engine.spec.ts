import { Test, TestingModule } from '@nestjs/testing';
import {
  SchedulingEngineService,
  ScheduleMatchInput,
  ScheduleCourtInput,
} from './scheduling-engine.service';

describe('SchedulingEngineService', () => {
  let service: SchedulingEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulingEngineService],
    }).compile();

    service = module.get<SchedulingEngineService>(SchedulingEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectConflicts', () => {
    it('should detect COURT_OVERLAP when two matches overlap on the same court', () => {
      const baseTime = new Date('2027-02-01T08:00:00Z');
      const matches: ScheduleMatchInput[] = [
        {
          id: 'm1',
          matchCode: 'M-01',
          roundNumber: 1,
          courtId: 'court_1',
          scheduledStartTime: baseTime, // 08:00 - 08:35
          estimatedDurationMinutes: 35,
          teamAAthleteIds: ['a1'],
          teamBAthleteIds: ['a2'],
          isTimeLocked: false,
        },
        {
          id: 'm2',
          matchCode: 'M-02',
          roundNumber: 1,
          courtId: 'court_1',
          scheduledStartTime: new Date('2027-02-01T08:20:00Z'), // 08:20 - 08:55 (Overlap!)
          estimatedDurationMinutes: 35,
          teamAAthleteIds: ['a3'],
          teamBAthleteIds: ['a4'],
          isTimeLocked: false,
        },
      ];

      const conflicts = service.detectConflicts(matches);
      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      expect(conflicts[0].type).toBe('COURT_OVERLAP');
      expect(conflicts[0].severity).toBe('ERROR');
    });

    it('should detect ATHLETE_OVERLAP when a player is scheduled for two concurrent matches', () => {
      const baseTime = new Date('2027-02-01T08:00:00Z');
      const matches: ScheduleMatchInput[] = [
        {
          id: 'm1',
          matchCode: 'M-01',
          roundNumber: 1,
          courtId: 'court_1',
          scheduledStartTime: baseTime,
          estimatedDurationMinutes: 35,
          teamAAthleteIds: ['athlete_star'],
          teamBAthleteIds: ['a2'],
          isTimeLocked: false,
        },
        {
          id: 'm2',
          matchCode: 'M-02',
          roundNumber: 1,
          courtId: 'court_2', // Different court
          scheduledStartTime: new Date('2027-02-01T08:10:00Z'), // Same time!
          estimatedDurationMinutes: 35,
          teamAAthleteIds: ['athlete_star'], // Same athlete!
          teamBAthleteIds: ['a4'],
          isTimeLocked: false,
        },
      ];

      const conflicts = service.detectConflicts(matches);
      const athleteConflict = conflicts.find((c) => c.type === 'ATHLETE_OVERLAP');
      expect(athleteConflict).toBeDefined();
      expect(athleteConflict?.severity).toBe('ERROR');
    });

    it('should detect INSUFFICIENT_REST when an athlete has < 20 mins between matches', () => {
      const matches: ScheduleMatchInput[] = [
        {
          id: 'm1',
          matchCode: 'M-01',
          roundNumber: 1,
          courtId: 'court_1',
          scheduledStartTime: new Date('2027-02-01T08:00:00Z'), // Ends at 08:35
          estimatedDurationMinutes: 35,
          teamAAthleteIds: ['athlete_1'],
          teamBAthleteIds: ['a2'],
          isTimeLocked: false,
        },
        {
          id: 'm2',
          matchCode: 'M-02',
          roundNumber: 1,
          courtId: 'court_2',
          scheduledStartTime: new Date('2027-02-01T08:45:00Z'), // Starts at 08:45 -> Only 10 mins rest!
          estimatedDurationMinutes: 35,
          teamAAthleteIds: ['athlete_1'],
          teamBAthleteIds: ['a4'],
          isTimeLocked: false,
        },
      ];

      const conflicts = service.detectConflicts(matches, 20);
      const restConflict = conflicts.find((c) => c.type === 'INSUFFICIENT_REST');
      expect(restConflict).toBeDefined();
      expect(restConflict?.severity).toBe('WARNING');
    });
  });

  describe('generateAutoSchedule', () => {
    it('should distribute matches across courts without overlap', () => {
      const courts: ScheduleCourtInput[] = [
        { id: 'c1', name: 'Sân 1', courtOrder: 1 },
        { id: 'c2', name: 'Sân 2', courtOrder: 2 },
      ];

      const startTime = new Date('2027-02-01T08:00:00Z');
      const matches: ScheduleMatchInput[] = Array.from({ length: 6 }, (_, i) => ({
        id: `m_${i + 1}`,
        matchCode: `M-${i + 1}`,
        roundNumber: 1,
        bracketPosition: i + 1,
        teamAAthleteIds: [`player_${i * 2 + 1}`],
        teamBAthleteIds: [`player_${i * 2 + 2}`],
        estimatedDurationMinutes: 35,
        isTimeLocked: false,
      }));

      const scheduled = service.generateAutoSchedule(
        matches,
        courts,
        startTime,
        35,
        15,
        20,
      );

      expect(scheduled.length).toBe(6);

      // Verify no conflicts generated
      const matchInputs: ScheduleMatchInput[] = scheduled.map((s) => ({
        ...matches.find((m) => m.id === s.id)!,
        courtId: s.courtId,
        scheduledStartTime: s.scheduledStartTime,
      }));

      const conflicts = service.detectConflicts(matchInputs, 20);
      expect(conflicts.filter((c) => c.severity === 'ERROR').length).toBe(0);
    });

    it('should respect isTimeLocked invariant', () => {
      const courts: ScheduleCourtInput[] = [
        { id: 'c1', name: 'Sân 1', courtOrder: 1 },
      ];

      const lockedTime = new Date('2027-02-01T10:00:00Z');
      const matches: ScheduleMatchInput[] = [
        {
          id: 'm_locked',
          matchCode: 'M-LOCKED',
          roundNumber: 1,
          courtId: 'c1',
          scheduledStartTime: lockedTime,
          estimatedDurationMinutes: 35,
          isTimeLocked: true,
          teamAAthleteIds: ['p1'],
          teamBAthleteIds: ['p2'],
        },
        {
          id: 'm_unlocked',
          matchCode: 'M-UNLOCKED',
          roundNumber: 1,
          estimatedDurationMinutes: 35,
          isTimeLocked: false,
          teamAAthleteIds: ['p3'],
          teamBAthleteIds: ['p4'],
        },
      ];

      const scheduled = service.generateAutoSchedule(
        matches,
        courts,
        new Date('2027-02-01T08:00:00Z'),
        35,
        15,
        20,
      );

      const lockedResult = scheduled.find((s) => s.id === 'm_locked');
      expect(lockedResult?.scheduledStartTime.toISOString()).toBe(lockedTime.toISOString());
      expect(lockedResult?.isTimeLocked).toBe(true);
    });
  });

  describe('recalculateOverrun', () => {
    it('should ripple downstream unlocked matches when match overruns', () => {
      const courts: ScheduleCourtInput[] = [
        { id: 'c1', name: 'Sân 1', courtOrder: 1 },
      ];

      // Match A ends at 08:35, Match B was at 08:50, Match C was at 09:40
      const matches: ScheduleMatchInput[] = [
        {
          id: 'm_a',
          matchCode: 'M-A',
          roundNumber: 1,
          courtId: 'c1',
          scheduledStartTime: new Date('2027-02-01T08:00:00Z'),
          estimatedDurationMinutes: 35,
          isTimeLocked: false,
          teamAAthleteIds: ['p1'],
          teamBAthleteIds: ['p2'],
        },
        {
          id: 'm_b',
          matchCode: 'M-B',
          roundNumber: 1,
          courtId: 'c1',
          scheduledStartTime: new Date('2027-02-01T08:50:00Z'),
          estimatedDurationMinutes: 35,
          isTimeLocked: false,
          teamAAthleteIds: ['p3'],
          teamBAthleteIds: ['p4'],
        },
      ];

      // Match A overruns by 25 mins: finishes at 09:00!
      const actualEnd = new Date('2027-02-01T09:00:00Z');
      const { updatedMatches, unresolvedConflicts } = service.recalculateOverrun(
        'm_a',
        actualEnd,
        matches,
        courts,
        15, // 15 min interval
        20,
      );

      expect(unresolvedConflicts.length).toBe(0);
      expect(updatedMatches.length).toBe(1);

      // Match B new start = 09:00 + 15 min interval = 09:15
      expect(updatedMatches[0].id).toBe('m_b');
      expect(updatedMatches[0].scheduledStartTime.toISOString()).toBe(
        new Date('2027-02-01T09:15:00Z').toISOString(),
      );
    });

    it('should flag LOCK_TIME_VIOLATION if downstream match is locked and cannot be pushed', () => {
      const courts: ScheduleCourtInput[] = [
        { id: 'c1', name: 'Sân 1', courtOrder: 1 },
      ];

      const matches: ScheduleMatchInput[] = [
        {
          id: 'm_a',
          matchCode: 'M-A',
          roundNumber: 1,
          courtId: 'c1',
          scheduledStartTime: new Date('2027-02-01T08:00:00Z'),
          estimatedDurationMinutes: 35,
          isTimeLocked: false,
          teamAAthleteIds: ['p1'],
          teamBAthleteIds: ['p2'],
        },
        {
          id: 'm_b',
          matchCode: 'M-B',
          roundNumber: 1,
          courtId: 'c1',
          scheduledStartTime: new Date('2027-02-01T09:00:00Z'),
          estimatedDurationMinutes: 35,
          isTimeLocked: true, // LOCKED!
          teamAAthleteIds: ['p3'],
          teamBAthleteIds: ['p4'],
        },
      ];

      // Match A finishes at 09:10 -> Court free at 09:25 -> Collides with locked match M-B at 09:00!
      const actualEnd = new Date('2027-02-01T09:10:00Z');
      const { updatedMatches, unresolvedConflicts } = service.recalculateOverrun(
        'm_a',
        actualEnd,
        matches,
        courts,
        15,
        20,
      );

      expect(unresolvedConflicts.length).toBe(1);
      expect(unresolvedConflicts[0].type).toBe('LOCK_TIME_VIOLATION');
      expect(unresolvedConflicts[0].severity).toBe('ERROR');
    });
  });
});

