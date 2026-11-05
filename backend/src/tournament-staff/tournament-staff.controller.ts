import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TournamentStaffService } from './tournament-staff.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentStaffGuard } from '../auth/guards/tournament-staff.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tournaments/:tournamentId/staff')
@UseGuards(JwtAuthGuard, TournamentStaffGuard)
export class TournamentStaffController {
  constructor(private readonly staffService: TournamentStaffService) {}

  @Get()
  async getStaff(@Param('tournamentId') tournamentId: string) {
    const data = await this.staffService.getStaff(tournamentId);
    return {
      message: 'Lấy danh sách nhân sự giải đấu thành công',
      data,
    };
  }

  @Post()
  async inviteStaff(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: InviteStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.staffService.inviteStaff(tournamentId, dto, userId);
    return {
      message: 'Thêm nhân sự giải đấu thành công',
      data,
    };
  }

  @Delete(':staffId')
  async revokeStaff(
    @Param('tournamentId') tournamentId: string,
    @Param('staffId') staffId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.staffService.revokeStaff(tournamentId, staffId, userId);
    return {
      message: 'Thu hồi quyền nhân sự thành công',
      data,
    };
  }
}

