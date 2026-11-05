import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.venue.findMany({
      include: {
        courts: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        courts: true,
      },
    });
    if (!venue) {
      throw new NotFoundException('Địa điểm không tồn tại');
    }
    return venue;
  }

  async create(dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        countryCode: dto.countryCode || 'VN',
        contactPhone: dto.contactPhone || null,
        description: dto.description || null,
      },
    });
  }
}

