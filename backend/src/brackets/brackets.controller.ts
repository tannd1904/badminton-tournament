import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BracketsService } from './brackets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('events/:eventId')
export class BracketsController {
  constructor(private readonly bracketsService: BracketsService) {}

  @Post('draw/preview')
  @UseGuards(JwtAuthGuard)
  async previewDraw(@Param('eventId') eventId: string) {
    const data = await this.bracketsService.previewDraw(eventId);
    return {
      message: 'Xem trước kết quả bốc thăm thành công',
      data,
    };
  }

  @Post('draw/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmDraw(
    @Param('eventId') eventId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.bracketsService.confirmDraw(eventId, userId);
    return {
      message: 'Chính thức xác nhận bốc thăm chia nhánh thành công',
      data,
    };
  }

  @Get('bracket')
  async getBracketTree(@Param('eventId') eventId: string) {
    const data = await this.bracketsService.getBracketTree(eventId);
    return {
      message: 'Lấy cây nhánh đấu thành công',
      data,
    };
  }
}

