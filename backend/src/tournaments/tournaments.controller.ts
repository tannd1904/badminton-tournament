import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TournamentStaffGuard } from '../auth/guards/tournament-staff.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { TournamentStatus, UserRole } from '@prisma/client';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  async findAll(
    @Query('status') status?: TournamentStatus,
    @Query('sportId') sportId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const res = await this.tournamentsService.findAll({
      status,
      sportId,
      search,
      page,
      limit,
    });
    return {
      message: 'Lấy danh sách giải đấu thành công',
      data: res.data,
      meta: res.meta,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateTournamentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.create(dto, userId);
    return {
      message: 'Tạo giải đấu mới thành công',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.tournamentsService.findOne(id);
    return {
      message: 'Lấy thông tin giải đấu thành công',
      data,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.update(id, dto, userId);
    return {
      message: 'Cập nhật giải đấu thành công',
      data,
    };
  }

  @Post(':id/submit-approval')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async submitApproval(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.submitApproval(id, userId);
    return {
      message: 'Gửi yêu cầu phê duyệt giải đấu thành công',
      data,
    };
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.approve(id, userId);
    return {
      message: 'Phê duyệt giải đấu thành công',
      data,
    };
  }

  @Post(':id/open-registration')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async openRegistration(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.openRegistration(id, userId);
    return {
      message: 'Mở cổng đăng ký giải đấu thành công',
      data,
    };
  }

  @Post(':id/close-registration')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async closeRegistration(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.closeRegistration(id, userId);
    return {
      message: 'Đóng cổng đăng ký giải đấu thành công',
      data,
    };
  }

  @Post(':id/publish-schedule')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async publishSchedule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.publishSchedule(id, userId);
    return {
      message: 'Công bố lịch thi đấu chính thức thành công',
      data,
    };
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async startTournament(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.startTournament(id, userId);
    return {
      message: 'Khai mạc giải đấu thành công (IN_PROGRESS)',
      data,
    };
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async completeTournament(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tournamentsService.completeTournament(id, userId);
    return {
      message: 'Hoàn thành và lưu trữ kết quả giải đấu thành công',
      data,
    };
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async cancelTournament(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.tournamentsService.cancelTournament(id, userId, reason);
    return {
      message: 'Hủy giải đấu thành công',
      data,
    };
  }
}

