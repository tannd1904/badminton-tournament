import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentStatus, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get system-wide platform metrics
   */
  async getSystemAnalytics() {
    const [
      totalUsers,
      totalTournaments,
      totalMatches,
      totalClubs,
      tournamentsByStatus,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.tournament.count(),
      this.prisma.match.count(),
      this.prisma.club.count(),
      this.prisma.tournament.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    tournamentsByStatus.forEach((g) => {
      statusCounts[g.status] = g._count.id;
    });

    return {
      totalUsers,
      totalTournaments,
      totalMatches,
      totalClubs,
      statusCounts,
      recentUsers,
    };
  }

  /**
   * Get tournaments for moderation
   */
  async getTournamentsForModeration(status?: TournamentStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.tournament.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
        events: { select: { id: true, name: true, playType: true } },
        courts: { select: { id: true, name: true } },
        _count: { select: { events: true, courts: true, staff: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Moderate tournament status (APPROVE, REJECT, SUSPEND)
   */
  async moderateTournament(
    tournamentId: string,
    targetStatus: TournamentStatus,
    reason: string | undefined,
    adminUserId: string,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    const oldStatus = tournament.status;

    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: targetStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        tournamentId,
        action: `TOURNAMENT_MODERATED_${targetStatus}`,
        entityType: 'TOURNAMENT',
        entityId: tournamentId,
        oldValue: { status: oldStatus },
        newValue: { status: targetStatus, reason },
      },
    });

    return updated;
  }

  /**
   * Get all users with filters
   */
  async getUsersList(query?: { role?: UserRole; search?: string }) {
    const where: any = {};

    if (query?.role) {
      where.role = query.role;
    }

    if (query?.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            createdTournaments: true,
            participantMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update user active status
   */
  async updateUserStatus(userId: string, isActive: boolean, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const newStatus = isActive ? UserStatus.ACTIVE : UserStatus.SUSPENDED;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
        entityType: 'USER',
        entityId: userId,
        newValue: { status: newStatus },
      },
    });

    return updated;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'USER_ROLE_CHANGED',
        entityType: 'USER',
        entityId: userId,
        oldValue: { role: user.role },
        newValue: { role },
      },
    });

    return updated;
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(page = 1, limit = 50, entityType?: string, action?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (entityType) {
      where.entityType = entityType;
    }
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
          tournament: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
