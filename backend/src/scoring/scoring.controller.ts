import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ScoringService } from './scoring.service';
import {
  RecordPointDto,
  WalkoverDto,
  StartMatchDto,
} from './dto/scoring.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('matches')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get(':id/score')
  async getMatchScore(@Param('id') matchId: string) {
    const data = await this.scoringService.getMatchScore(matchId);
    return {
      message: 'Lấy thông tin điểm số trận đấu thành công',
      data,
    };
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async startMatch(
    @Param('id') matchId: string,
    @Body() dto: StartMatchDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.scoringService.startMatch(matchId, dto, userId);
    return {
      message: 'Bắt đầu trận đấu thành công',
      data,
    };
  }

  @Post(':id/score/point')
  @UseGuards(JwtAuthGuard)
  async recordPoint(
    @Param('id') matchId: string,
    @Body() dto: RecordPointDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.scoringService.recordPoint(matchId, dto, userId);
    return {
      message: 'Ghi nhận điểm số thành công',
      data,
    };
  }

  @Post(':id/score/undo')
  @UseGuards(JwtAuthGuard)
  async undoPoint(
    @Param('id') matchId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.scoringService.undoLastPoint(matchId, userId);
    return {
      message: data.message,
      data,
    };
  }

  @Post(':id/score/walkover')
  @UseGuards(JwtAuthGuard)
  async walkoverMatch(
    @Param('id') matchId: string,
    @Body() dto: WalkoverDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.scoringService.walkoverMatch(matchId, dto, userId);
    return {
      message: data.message,
      data,
    };
  }
}

