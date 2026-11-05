import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingEngineService } from './scheduling-engine.service';
import { SchedulingController } from './scheduling.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingEngineService],
  exports: [SchedulingService, SchedulingEngineService],
})
export class SchedulingModule {}

