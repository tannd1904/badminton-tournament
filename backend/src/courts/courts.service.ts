import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { CourtStatus } from '@prisma/client';

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTournament(tournamentId: string) {
    return this.prisma.court.findMany({
      where: { tournamentId },
      orderBy: { courtOrder: 'asc' },
    });
  }

  async findByVenue(venueId: string) {
    return this.prisma.court.findMany({
      where: { venueId },
      orderBy: { courtOrder: 'asc' },
    });
  }

  async create(dto: CreateCourtDto) {
    return this.prisma.court.create({
      data: {
        name: dto.name,
        courtOrder: dto.courtOrder || 1,
        venueId: dto.venueId || null,
        tournamentId: dto.tournamentId || null,
        status: dto.status || CourtStatus.AVAILABLE,
      },
    });
  }

  async updateStatus(id: string, status: CourtStatus) {
    const court = await this.prisma.court.findUnique({ where: { id } });
    if (!court) {
      throw new NotFoundException('Sân không tồn tại');
    }
    return this.prisma.court.update({
      where: { id },
      data: { status },
    });
  }
}

