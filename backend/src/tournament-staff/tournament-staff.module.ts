import { Module } from '@nestjs/common';
import { TournamentStaffController } from './tournament-staff.controller';
import { TournamentStaffService } from './tournament-staff.service';

@Module({
  controllers: [TournamentStaffController],
  providers: [TournamentStaffService],
  exports: [TournamentStaffService],
})
export class TournamentStaffModule {}

