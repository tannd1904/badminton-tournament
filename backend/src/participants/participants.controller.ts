import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Patch(':id/seed')
  @UseGuards(JwtAuthGuard)
  async updateSeed(
    @Param('id') id: string,
    @Body('isSeeded') isSeeded: boolean,
    @Body('seedNumber') seedNumber: number | null,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.participantsService.updateSeed(
      id,
      isSeeded,
      seedNumber ? Number(seedNumber) : null,
      userId,
    );
    return {
      message: 'Cập nhật hạt giống thành công',
      data,
    };
  }

  @Get('event/:eventId/approved')
  async findApproved(@Param('eventId') eventId: string) {
    const data = await this.participantsService.findApprovedByEvent(eventId);
    return {
      message: 'Lấy danh sách VĐV đã duyệt thành công',
      data,
    };
  }
}

