import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.club.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
    });
    if (!club) {
      throw new NotFoundException('Câu lạc bộ không tồn tại');
    }
    return club;
  }

  async create(dto: CreateClubDto) {
    return this.prisma.club.create({
      data: {
        name: dto.name,
        code: dto.code || null,
        logoUrl: dto.logoUrl || null,
        description: dto.description || null,
        contactPerson: dto.contactPerson || null,
        contactPhone: dto.contactPhone || null,
      },
    });
  }
}

