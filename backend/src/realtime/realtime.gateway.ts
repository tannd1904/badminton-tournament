import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTournament')
  handleJoinTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    if (data?.tournamentId) {
      client.join(`tournament:${data.tournamentId}`);
      this.logger.log(`Client ${client.id} joined tournament:${data.tournamentId}`);
      return { event: 'joinedTournament', data: { tournamentId: data.tournamentId } };
    }
  }

  @SubscribeMessage('leaveTournament')
  handleLeaveTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    if (data?.tournamentId) {
      client.leave(`tournament:${data.tournamentId}`);
      return { event: 'leftTournament', data: { tournamentId: data.tournamentId } };
    }
  }

  @SubscribeMessage('joinMatch')
  handleJoinMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    if (data?.matchId) {
      client.join(`match:${data.matchId}`);
      this.logger.log(`Client ${client.id} joined match:${data.matchId}`);
      return { event: 'joinedMatch', data: { matchId: data.matchId } };
    }
  }

  @SubscribeMessage('leaveMatch')
  handleLeaveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    if (data?.matchId) {
      client.leave(`match:${data.matchId}`);
      return { event: 'leftMatch', data: { matchId: data.matchId } };
    }
  }

  /**
   * Broadcast real-time score updates to match and tournament rooms
   */
  emitScoreUpdate(matchId: string, tournamentId: string | undefined, payload: any) {
    if (this.server) {
      this.server.to(`match:${matchId}`).emit('match.score.updated', payload);
      if (tournamentId) {
        this.server.to(`tournament:${tournamentId}`).emit('tournament.match.updated', payload);
      }
      // Also broadcast to public live ticker room
      this.server.emit('live.score.tick', payload);
    }
  }

  /**
   * Broadcast match completion
   */
  emitMatchCompleted(matchId: string, tournamentId: string | undefined, payload: any) {
    if (this.server) {
      this.server.to(`match:${matchId}`).emit('match.completed', payload);
      if (tournamentId) {
        this.server.to(`tournament:${tournamentId}`).emit('tournament.match.completed', payload);
      }
      this.server.emit('live.score.tick', payload);
    }
  }

  /**
   * Broadcast tournament schedule updates
   */
  emitScheduleUpdated(tournamentId: string, payload: any) {
    if (this.server) {
      this.server.to(`tournament:${tournamentId}`).emit('schedule.updated', payload);
    }
  }
}

