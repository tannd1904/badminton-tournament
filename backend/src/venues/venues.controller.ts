import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async findAll() {
    const data = await this.venuesService.findAll();
    return {
      message: 'Lấy danh sách địa điểm thành công',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.venuesService.findOne(id);
    return {
      message: 'Lấy thông tin địa điểm thành công',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateVenueDto) {
    const data = await this.venuesService.create(dto);
    return {
      message: 'Tạo địa điểm thành công',
      data,
    };
  }
}

