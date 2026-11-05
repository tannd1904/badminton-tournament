import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SportsModule } from './sports/sports.module';
import { VenuesModule } from './venues/venues.module';
import { CourtsModule } from './courts/courts.module';
import { ClubsModule } from './clubs/clubs.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TournamentStaffModule } from './tournament-staff/tournament-staff.module';
import { EventsModule } from './events/events.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { ParticipantsModule } from './participants/participants.module';
import { BracketsModule } from './brackets/brackets.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ScoringModule } from './scoring/scoring.module';
import { MatchesModule } from './matches/matches.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    RealtimeModule,
    AdminModule,
    HealthModule,
    AuthModule,
    SportsModule,
    VenuesModule,
    CourtsModule,
    ClubsModule,
    TournamentsModule,
    TournamentStaffModule,
    EventsModule,
    RegistrationsModule,
    ParticipantsModule,
    BracketsModule,
    SchedulingModule,
    ScoringModule,
    MatchesModule,
  ],
})
export class AppModule {}
