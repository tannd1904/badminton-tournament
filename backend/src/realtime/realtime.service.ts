import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyScoreUpdate(matchId: string, tournamentId: string | undefined, payload: any) {
    this.gateway.emitScoreUpdate(matchId, tournamentId, payload);
  }

  notifyMatchCompleted(matchId: string, tournamentId: string | undefined, payload: any) {
    this.gateway.emitMatchCompleted(matchId, tournamentId, payload);
  }

  notifyScheduleUpdated(tournamentId: string, payload: any) {
    this.gateway.emitScheduleUpdated(tournamentId, payload);
  }
}

