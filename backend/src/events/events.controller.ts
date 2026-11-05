import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentStaffGuard } from '../auth/guards/tournament-staff.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findByTournament(@Query('tournamentId') tournamentId: string) {
    if (!tournamentId) {
      return { message: 'Yêu cầu tournamentId', data: [] };
    }
    const data = await this.eventsService.findByTournament(tournamentId);
    return {
      message: 'Lấy danh sách nội dung thi đấu thành công',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.eventsService.findOne(id);
    return {
      message: 'Lấy thông tin nội dung thi đấu thành công',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, TournamentStaffGuard)
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.eventsService.create(dto, userId);
    return {
      message: 'Tạo nội dung thi đấu thành công',
      data,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.eventsService.update(id, dto, userId);
    return {
      message: 'Cập nhật nội dung thi đấu thành công',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.eventsService.delete(id, userId);
    return {
      message: 'Xóa nội dung thi đấu thành công',
      data,
    };
  }
}

