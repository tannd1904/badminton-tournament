import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RejectRegistrationDto, UpdatePaymentDto } from './dto/review-registration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('registrations')
  @UseGuards(JwtAuthGuard)
  async register(
    @Body() dto: CreateRegistrationDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.registrationsService.register(dto, userId);
    return {
      message: 'Gửi hồ sơ đăng ký thành công',
      data,
    };
  }

  @Get('tournaments/:tournamentId/registrations')
  @UseGuards(JwtAuthGuard)
  async findByTournament(@Param('tournamentId') tournamentId: string) {
    const data = await this.registrationsService.findByTournament(tournamentId);
    return {
      message: 'Lấy danh sách đăng ký giải đấu thành công',
      data,
    };
  }

  @Get('events/:eventId/registrations')
  async findByEvent(@Param('eventId') eventId: string) {
    const data = await this.registrationsService.findByEvent(eventId);
    return {
      message: 'Lấy danh sách đăng ký nội dung thành công',
      data,
    };
  }

  @Patch('registrations/:id/approve')
  @UseGuards(JwtAuthGuard)
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.registrationsService.approve(id, userId);
    return {
      message: 'Duyệt hồ sơ đăng ký thành công',
      data,
    };
  }

  @Patch('registrations/:id/reject')
  @UseGuards(JwtAuthGuard)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.registrationsService.reject(id, dto, userId);
    return {
      message: 'Từ chối hồ sơ đăng ký thành công',
      data,
    };
  }

  @Patch('registrations/participants/:participantId/check-in')
  @UseGuards(JwtAuthGuard)
  async checkIn(
    @Param('participantId') participantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.registrationsService.checkInParticipant(participantId, userId);
    return {
      message: 'Cập nhật trạng thái điểm danh thành công',
      data,
    };
  }

  @Patch('registrations/payments/:paymentId')
  @UseGuards(JwtAuthGuard)
  async updatePayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.registrationsService.updatePayment(paymentId, dto, userId);
    return {
      message: 'Cập nhật trạng thái thanh toán thành công',
      data,
    };
  }

  @Get('tournaments/:tournamentId/registrations/export')
  @UseGuards(JwtAuthGuard)
  async exportCsv(
    @Param('tournamentId') tournamentId: string,
    @Res() res: Response,
  ) {
    const csvData = await this.registrationsService.exportCsv(tournamentId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=danh-sach-vdv-${tournamentId}.csv`,
    );
    // Add UTF-8 BOM so Excel on Windows opens Vietnamese correctly
    return res.send('\uFEFF' + csvData);
  }
}

