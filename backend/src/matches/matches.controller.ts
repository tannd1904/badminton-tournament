import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MatchesService, MatchesFilterQuery } from './matches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MatchStatus } from '@prisma/client';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  async getMatches(
    @Query('tournamentId') tournamentId?: string,
    @Query('eventId') eventId?: string,
    @Query('courtId') courtId?: string,
    @Query('refereeUserId') refereeUserId?: string,
    @Query('status') status?: MatchStatus,
  ) {
    const data = await this.matchesService.getMatches({
      tournamentId,
      eventId,
      courtId,
      refereeUserId,
      status,
    });
    return {
      message: 'Lấy danh sách trận đấu thành công',
      data,
    };
  }

  @Get(':id')
  async getMatchById(@Param('id') matchId: string) {
    const data = await this.matchesService.getMatchById(matchId);
    return {
      message: 'Lấy thông tin chi tiết trận đấu thành công',
      data,
    };
  }

  @Patch(':id/referee')
  @UseGuards(JwtAuthGuard)
  async assignReferee(
    @Param('id') matchId: string,
    @Body('refereeUserId') refereeUserId: string | null,
    @CurrentUser('id') operatorUserId: string,
  ) {
    const data = await this.matchesService.assignReferee(
      matchId,
      refereeUserId,
      operatorUserId,
    );
    return {
      message: 'Gán trọng tài cho trận đấu thành công',
      data,
    };
  }
}

