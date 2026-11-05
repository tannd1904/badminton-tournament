import { Module } from '@nestjs/common';
import { BracketsController } from './brackets.controller';
import { BracketsService } from './brackets.service';
import { TournamentEngineService } from './tournament-engine.service';

@Module({
  controllers: [BracketsController],
  providers: [BracketsService, TournamentEngineService],
  exports: [BracketsService, TournamentEngineService],
})
export class BracketsModule {}

