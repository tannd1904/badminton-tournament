import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourtStatus } from '@prisma/client';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Get()
  async findCourts(
    @Query('tournamentId') tournamentId?: string,
    @Query('venueId') venueId?: string,
  ) {
    if (tournamentId) {
      const data = await this.courtsService.findByTournament(tournamentId);
      return { message: 'Lấy danh sách sân thi đấu thành công', data };
    }
    if (venueId) {
      const data = await this.courtsService.findByVenue(venueId);
      return { message: 'Lấy danh sách sân địa điểm thành công', data };
    }
    return { message: 'Yêu cầu tournamentId hoặc venueId', data: [] };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateCourtDto) {
    const data = await this.courtsService.create(dto);
    return {
      message: 'Tạo sân thành công',
      data,
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CourtStatus,
  ) {
    const data = await this.courtsService.updateStatus(id, status);
    return {
      message: 'Cập nhật trạng thái sân thành công',
      data,
    };
  }
}

