import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ScoringEngineService } from './scoring-engine.service';
import { ScoringController } from './scoring.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScoringController],
  providers: [ScoringService, ScoringEngineService],
  exports: [ScoringService, ScoringEngineService],
})
export class ScoringModule {}

