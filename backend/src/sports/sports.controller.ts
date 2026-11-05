import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SportsService } from './sports.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  async findAll() {
    const data = await this.sportsService.findAll();
    return {
      message: 'Lấy danh sách môn thể thao thành công',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.sportsService.findOne(id);
    return {
      message: 'Lấy thông tin môn thể thao thành công',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateSportDto) {
    const data = await this.sportsService.create(dto);
    return {
      message: 'Thêm môn thể thao thành công',
      data,
    };
  }
}

