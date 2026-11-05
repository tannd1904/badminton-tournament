import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  async findAll() {
    const data = await this.clubsService.findAll();
    return {
      message: 'Lấy danh sách câu lạc bộ thành công',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.clubsService.findOne(id);
    return {
      message: 'Lấy thông tin câu lạc bộ thành công',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateClubDto) {
    const data = await this.clubsService.create(dto);
    return {
      message: 'Tạo câu lạc bộ thành công',
      data,
    };
  }
}

