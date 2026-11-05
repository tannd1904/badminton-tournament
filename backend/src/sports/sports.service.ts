import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSportDto } from './dto/create-sport.dto';

@Injectable()
export class SportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const sport = await this.prisma.sport.findUnique({
      where: { id },
    });
    if (!sport) {
      throw new NotFoundException('Môn thể thao không tồn tại');
    }
    return sport;
  }

  async create(dto: CreateSportDto) {
    const existing = await this.prisma.sport.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Môn thể thao với mã '${dto.code}' đã tồn tại`);
    }

    return this.prisma.sport.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description || null,
      },
    });
  }
}

