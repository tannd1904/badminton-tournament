import { Injectable } from '@nestjs/common';

export type TeamSide = 'TEAM_A' | 'TEAM_B';
export type CourtSide = 'RIGHT' | 'LEFT';

export interface PlayerPosition {
  userId: string;
  name: string;
  courtSide: CourtSide; // RIGHT (even) or LEFT (odd)
}

export interface DoublesTeamPositions {
  team: TeamSide;
  player1: PlayerPosition;
  player2?: PlayerPosition;
}

export interface CurrentSetState {
  setNumber: number; // 1, 2, or 3
  scoreTeamA: number;
  scoreTeamB: number;
  servingTeam: TeamSide;
  serverUserId?: string;
  receiverUserId?: string;
  isIntervalReached?: boolean; // 11-point interval
  isSetWon?: boolean;
  setWinner?: TeamSide;
}

export interface MatchScoreState {
  setsWonTeamA: number;
  setsWonTeamB: number;
  isMatchWon: boolean;
  matchWinner?: TeamSide;
  currentSet: CurrentSetState;
  completedSets: {
    setNumber: number;
    scoreTeamA: number;
    scoreTeamB: number;
    winner: TeamSide;
  }[];
}

export interface PointCalculationResult {
  newScoreTeamA: number;
  newScoreTeamB: number;
  servingTeam: TeamSide;
  isIntervalReached: boolean;
  intervalMessage?: string;
  isDeuce: boolean;
  isSuddenDeath: boolean;
  isSetWon: boolean;
  setWinner?: TeamSide;
  isMatchWon: boolean;
  matchWinner?: TeamSide;
}

@Injectable()
export class ScoringEngineService {
  /**
   * BWF Standard rules:
   * - Best of 3 sets.
   * - 21 points to win.
   * - At 20-20 (deuce), must lead by 2 points to win.
   * - At 29-29 (golden point / sudden death), first to 30 wins (30-29).
   */
  public readonly POINTS_TO_WIN = 21;
  public readonly DEUCE_THRESHOLD = 20;
  public readonly SUDDEN_DEATH_THRESHOLD = 29;
  public readonly MAX_POINTS_CAP = 30;
  public readonly INTERVAL_POINTS = 11;

  /**
   * Calculates the outcome of a point won by winningTeam.
   */
  calculatePoint(
    currentState: CurrentSetState,
    pointWinner: TeamSide,
    priorSetsWonTeamA = 0,
    priorSetsWonTeamB = 0,
  ): PointCalculationResult {
    let scoreA = currentState.scoreTeamA;
    let scoreB = currentState.scoreTeamB;

    if (pointWinner === 'TEAM_A') {
      scoreA += 1;
    } else {
      scoreB += 1;
    }

    // Check interval (exactly when leading score hits 11 for the first time in this set)
    const prevMax = Math.max(currentState.scoreTeamA, currentState.scoreTeamB);
    const newMax = Math.max(scoreA, scoreB);
    const isIntervalReached = prevMax < this.INTERVAL_POINTS && newMax === this.INTERVAL_POINTS;
    let intervalMessage: string | undefined;
    if (isIntervalReached) {
      intervalMessage =
        currentState.setNumber === 3
          ? 'Nghỉ giải lao 60 giây và đổi sân (Set 3 đạt 11 điểm)'
          : 'Nghỉ giải lao giữa hiệp (60 giây khi đạt 11 điểm)';
    }

    // Check Deuce and Sudden Death
    const isDeuce = scoreA >= this.DEUCE_THRESHOLD && scoreB >= this.DEUCE_THRESHOLD && scoreA === scoreB;
    const isSuddenDeath = scoreA === this.SUDDEN_DEATH_THRESHOLD && scoreB === this.SUDDEN_DEATH_THRESHOLD;

    // Check Set Win
    let isSetWon = false;
    let setWinner: TeamSide | undefined;

    if (scoreA >= this.POINTS_TO_WIN || scoreB >= this.POINTS_TO_WIN) {
      const diff = Math.abs(scoreA - scoreB);

      // Normal win: reached 21 with at least 2 points lead
      if ((scoreA >= this.POINTS_TO_WIN || scoreB >= this.POINTS_TO_WIN) && diff >= 2) {
        isSetWon = true;
        setWinner = scoreA > scoreB ? 'TEAM_A' : 'TEAM_B';
      }
      // Sudden death cap win: 30-29
      else if (scoreA === this.MAX_POINTS_CAP || scoreB === this.MAX_POINTS_CAP) {
        isSetWon = true;
        setWinner = scoreA === this.MAX_POINTS_CAP ? 'TEAM_A' : 'TEAM_B';
      }
    }

    // Check Match Win (First to win 2 sets)
    let isMatchWon = false;
    let matchWinner: TeamSide | undefined;

    if (isSetWon && setWinner) {
      const setsA = priorSetsWonTeamA + (setWinner === 'TEAM_A' ? 1 : 0);
      const setsB = priorSetsWonTeamB + (setWinner === 'TEAM_B' ? 1 : 0);

      if (setsA >= 2) {
        isMatchWon = true;
        matchWinner = 'TEAM_A';
      } else if (setsB >= 2) {
        isMatchWon = true;
        matchWinner = 'TEAM_B';
      }
    }

    // Service side rules:
    // In badminton rally points, whoever wins the point serves next.
    const servingTeam = pointWinner;

    return {
      newScoreTeamA: scoreA,
      newScoreTeamB: scoreB,
      servingTeam,
      isIntervalReached,
      intervalMessage,
      isDeuce,
      isSuddenDeath,
      isSetWon,
      setWinner,
      isMatchWon,
      matchWinner,
    };
  }

  /**
   * Determine service court side based on score:
   * Even score (0, 2, 4...) -> RIGHT court
   * Odd score (1, 3, 5...) -> LEFT court
   */
  getServiceCourtSide(servingTeamScore: number): CourtSide {
    return servingTeamScore % 2 === 0 ? 'RIGHT' : 'LEFT';
  }

  /**
   * Doubles service rotation calculation:
   * When serving team wins rally:
   *  - Same server stays.
   *  - Server swaps service courts (RIGHT <-> LEFT).
   *  - Score increases.
   * When receiving team wins rally ("Service Over"):
   *  - Receiving team scores 1 point.
   *  - Neither player on either team changes courts!
   *  - The player of the new serving team standing in the court matching their new score
   *    (even -> RIGHT, odd -> LEFT) becomes the server.
   */
  updateDoublesPositions(
    positionsA: { rightPlayerId: string; leftPlayerId: string; currentServerId?: string },
    positionsB: { rightPlayerId: string; leftPlayerId: string; currentServerId?: string },
    previousServingTeam: TeamSide,
    rallyWinner: TeamSide,
    newServingTeamScore: number,
  ): {
    positionsA: { rightPlayerId: string; leftPlayerId: string };
    positionsB: { rightPlayerId: string; leftPlayerId: string };
    nextServerId: string;
    nextReceiverId: string;
  } {
    let nextPositionsA = { ...positionsA };
    let nextPositionsB = { ...positionsB };

    const expectedCourtSide = this.getServiceCourtSide(newServingTeamScore);

    if (rallyWinner === previousServingTeam) {
      // Serving team scored: swap their court positions
      if (rallyWinner === 'TEAM_A') {
        const temp = nextPositionsA.rightPlayerId;
        nextPositionsA.rightPlayerId = nextPositionsA.leftPlayerId;
        nextPositionsA.leftPlayerId = temp;
      } else {
        const temp = nextPositionsB.rightPlayerId;
        nextPositionsB.rightPlayerId = nextPositionsB.leftPlayerId;
        nextPositionsB.leftPlayerId = temp;
      }
    }
    // If receiving team won (Service Over), NO court swap takes place for either team!

    // Determine who serves and who receives:
    // The server is whichever player on the serving team is in the expected court side (RIGHT or LEFT)
    const servingPositions = rallyWinner === 'TEAM_A' ? nextPositionsA : nextPositionsB;
    const receivingPositions = rallyWinner === 'TEAM_A' ? nextPositionsB : nextPositionsA;

    const nextServerId =
      expectedCourtSide === 'RIGHT'
        ? servingPositions.rightPlayerId
        : servingPositions.leftPlayerId;

    const nextReceiverId =
      expectedCourtSide === 'RIGHT'
        ? receivingPositions.rightPlayerId
        : receivingPositions.leftPlayerId;

    return {
      positionsA: { rightPlayerId: nextPositionsA.rightPlayerId, leftPlayerId: nextPositionsA.leftPlayerId },
      positionsB: { rightPlayerId: nextPositionsB.rightPlayerId, leftPlayerId: nextPositionsB.leftPlayerId },
      nextServerId,
      nextReceiverId,
    };
  }
}

