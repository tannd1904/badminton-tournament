import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import {
  TournamentStatus,
  StaffRole,
  StaffStatus,
  CourtStatus,
} from '@prisma/client';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async create(dto: CreateTournamentDto, userId: string) {
    const regOpen = new Date(dto.registrationOpenAt);
    const regClose = new Date(dto.registrationCloseAt);
    const tourStart = new Date(dto.tournamentStartAt);
    const tourEnd = new Date(dto.tournamentEndAt);

    if (regClose <= regOpen) {
      throw new BadRequestException('Ngày đóng đăng ký phải sau ngày mở đăng ký');
    }
    if (tourStart < regClose) {
      throw new BadRequestException('Ngày bắt đầu giải phải sau hoặc bằng ngày đóng đăng ký');
    }
    if (tourEnd < tourStart) {
      throw new BadRequestException('Ngày kết thúc giải phải sau hoặc bằng ngày bắt đầu giải');
    }

    const baseSlug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.tournament.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.create({
        data: {
          name: dto.name,
          slug: finalSlug,
          sportId: dto.sportId,
          venueId: dto.venueId || null,
          countryCode: dto.countryCode || 'VN',
          timezone: dto.timezone || 'Asia/Ho_Chi_Minh',
          contactPhone: dto.contactPhone || null,
          contactEmail: dto.contactEmail || null,
          bannerUrl: dto.bannerUrl || null,
          logoUrl: dto.logoUrl || null,
          ruleContent: dto.ruleContent || null,
          ruleAttachmentUrl: dto.ruleAttachmentUrl || null,
          registrationOpenAt: regOpen,
          registrationCloseAt: regClose,
          tournamentStartAt: tourStart,
          tournamentEndAt: tourEnd,
          maxEventsPerPlayer: dto.maxEventsPerPlayer || 2,
          matchIntervalMinutes: dto.matchIntervalMinutes || 15,
          defaultMatchDurationMinutes: dto.defaultMatchDurationMinutes || 35,
          totalCourts: dto.totalCourts || 4,
          status: TournamentStatus.DRAFT,
          visibility: dto.visibility || 'PUBLIC',
          createdBy: userId,
        },
      });

      // Automatically register the creator as tournament ORGANIZER
      await tx.tournamentStaff.create({
        data: {
          tournamentId: tournament.id,
          userId,
          role: StaffRole.ORGANIZER,
          status: StaffStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // Automatically generate initial courts
      const courtCount = dto.totalCourts || 4;
      for (let i = 1; i <= courtCount; i++) {
        await tx.court.create({
          data: {
            tournamentId: tournament.id,
            venueId: dto.venueId || null,
            name: `Sân ${i}`,
            courtOrder: i,
            status: CourtStatus.AVAILABLE,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          tournamentId: tournament.id,
          action: 'TOURNAMENT_CREATED',
          entityType: 'TOURNAMENT',
          entityId: tournament.id,
          newValue: { name: tournament.name, slug: tournament.slug, status: tournament.status },
        },
      });

      return tournament;
    });
  }

  async findAll(query: {
    status?: TournamentStatus;
    sportId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.sportId) {
      where.sportId = query.sportId;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.tournament.count({ where }),
      this.prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tournamentStartAt: 'desc' },
        include: {
          sport: true,
          venue: true,
          _count: {
            select: {
              events: true,
              courts: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        sport: true,
        venue: true,
        courts: { orderBy: { courtOrder: 'asc' } },
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: {
              select: { participants: true, matches: true },
            },
          },
        },
        staff: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, avatarUrl: true },
            },
          },
        },
        sponsors: { orderBy: { displayOrder: 'asc' } },
        announcements: { orderBy: { publishedAt: 'desc' }, take: 5 },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    return tournament;
  }

  async update(id: string, dto: UpdateTournamentDto, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    const updateData: any = { ...dto };
    if (dto.registrationOpenAt) updateData.registrationOpenAt = new Date(dto.registrationOpenAt);
    if (dto.registrationCloseAt) updateData.registrationCloseAt = new Date(dto.registrationCloseAt);
    if (dto.tournamentStartAt) updateData.tournamentStartAt = new Date(dto.tournamentStartAt);
    if (dto.tournamentEndAt) updateData.tournamentEndAt = new Date(dto.tournamentEndAt);

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        tournamentId: id,
        action: 'TOURNAMENT_UPDATED',
        entityType: 'TOURNAMENT',
        entityId: id,
        oldValue: { name: tournament.name, status: tournament.status },
        newValue: updateData,
      },
    });

    return updated;
  }

  // State Machine Transition: DRAFT -> PENDING_APPROVAL
  async submitApproval(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(
        `Chỉ giải đấu ở trạng thái DRAFT mới có thể gửi phê duyệt (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.PENDING_APPROVAL, userId, 'SUBMIT_APPROVAL');
  }

  // State Machine Transition: PENDING_APPROVAL -> REGISTRATION_OPEN
  async approve(id: string, adminUserId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Chỉ giải đấu ở trạng thái PENDING_APPROVAL mới có thể phê duyệt (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.REGISTRATION_OPEN, adminUserId, 'APPROVE');
  }

  // State Machine Transition: -> REGISTRATION_OPEN
  async openRegistration(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException(
        `Không thể mở đăng ký từ trạng thái ${tournament.status}`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.REGISTRATION_OPEN, userId, 'OPEN_REGISTRATION');
  }

  // State Machine Transition: REGISTRATION_OPEN -> REGISTRATION_CLOSED
  async closeRegistration(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException(
        `Chỉ giải đấu đang mở đăng ký mới có thể đóng đăng ký (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.REGISTRATION_CLOSED, userId, 'CLOSE_REGISTRATION');
  }

  // State Machine Transition: REGISTRATION_CLOSED -> DRAW_COMPLETED
  async completeDraw(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.REGISTRATION_CLOSED) {
      throw new BadRequestException(
        `Chỉ giải đấu đã đóng đăng ký mới có thể hoàn tất bốc thăm (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.DRAW_COMPLETED, userId, 'COMPLETE_DRAW');
  }

  // State Machine Transition: DRAW_COMPLETED -> SCHEDULE_PUBLISHED
  async publishSchedule(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.DRAW_COMPLETED) {
      throw new BadRequestException(
        `Chỉ giải đấu đã hoàn thành bốc thăm mới có thể công bố lịch thi đấu (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.SCHEDULE_PUBLISHED, userId, 'PUBLISH_SCHEDULE');
  }

  // State Machine Transition: SCHEDULE_PUBLISHED -> IN_PROGRESS
  async startTournament(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.SCHEDULE_PUBLISHED) {
      throw new BadRequestException(
        `Chỉ giải đấu đã công bố lịch mới có thể bắt đầu thi đấu (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.IN_PROGRESS, userId, 'START_TOURNAMENT');
  }

  // State Machine Transition: IN_PROGRESS -> COMPLETED
  async completeTournament(id: string, userId: string) {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Chỉ giải đấu đang thi đấu mới có thể hoàn tất giải (Hiện tại: ${tournament.status})`,
      );
    }

    return this.transitionStatus(id, TournamentStatus.COMPLETED, userId, 'COMPLETE_TOURNAMENT');
  }

  // State Machine Transition: Cancel
  async cancelTournament(id: string, userId: string, reason?: string) {
    const tournament = await this.findOne(id);
    if (tournament.status === TournamentStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy giải đấu đã hoàn thành');
    }

    return this.transitionStatus(id, TournamentStatus.CANCELLED, userId, 'CANCEL_TOURNAMENT', { reason });
  }

  private async transitionStatus(
    id: string,
    newStatus: TournamentStatus,
    userId: string,
    action: string,
    extraMetadata?: Record<string, any>,
  ) {
    const oldTournament = await this.prisma.tournament.findUnique({
      where: { id },
      select: { status: true, name: true },
    });

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        tournamentId: id,
        action,
        entityType: 'TOURNAMENT',
        entityId: id,
        oldValue: { status: oldTournament?.status },
        newValue: { status: newStatus, ...extraMetadata },
      },
    });

    return updated;
  }
}

