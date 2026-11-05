import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import {
  UpdateMatchScheduleDto,
  ToggleLockTimeDto,
  RecalculateOverrunDto,
} from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('tournaments/:tournamentId/schedule')
  async getSchedule(@Param('tournamentId') tournamentId: string) {
    const data = await this.schedulingService.getTournamentSchedule(tournamentId);
    return {
      message: 'Lấy lịch thi đấu giải đấu thành công',
      data,
    };
  }

  @Post('tournaments/:tournamentId/schedule/generate')
  @UseGuards(JwtAuthGuard)
  async autoGenerate(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.schedulingService.autoGenerateSchedule(tournamentId, userId);
    return {
      message: data.message,
      data,
    };
  }

  @Patch('matches/:matchId/schedule')
  @UseGuards(JwtAuthGuard)
  async updateMatchSchedule(
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchScheduleDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.schedulingService.updateMatchSchedule(matchId, dto, userId);
    return {
      message: 'Cập nhật lịch trận đấu thành công',
      data,
    };
  }

  @Patch('matches/:matchId/lock-time')
  @UseGuards(JwtAuthGuard)
  async toggleLockTime(
    @Param('matchId') matchId: string,
    @Body() dto: ToggleLockTimeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.schedulingService.toggleLockTime(matchId, dto.isTimeLocked, userId);
    return {
      message: dto.isTimeLocked ? 'Đã khóa giờ thi đấu của trận' : 'Đã mở khóa giờ thi đấu',
      data,
    };
  }

  @Post('tournaments/:tournamentId/schedule/recalculate')
  @UseGuards(JwtAuthGuard)
  async recalculateOverrun(
    @Body() dto: RecalculateOverrunDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.schedulingService.recalculateOverrun(dto, userId);
    return {
      message: data.message,
      data,
    };
  }

  @Post('tournaments/:tournamentId/schedule/publish')
  @UseGuards(JwtAuthGuard)
  async publishSchedule(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.schedulingService.publishSchedule(tournamentId, userId);
    return {
      message: 'Chính thức công bố lịch thi đấu thành công',
      data,
    };
  }
}

