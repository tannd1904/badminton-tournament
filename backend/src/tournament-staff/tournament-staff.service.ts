import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { StaffStatus } from '@prisma/client';

@Injectable()
export class TournamentStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async getStaff(tournamentId: string) {
    return this.prisma.tournamentStaff.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  async inviteStaff(tournamentId: string, dto: InviteStaffDto, inviterUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy tài khoản với email '${dto.email}'. Người dùng cần tạo tài khoản trước khi được phân quyền.`,
      );
    }

    const existingStaff = await this.prisma.tournamentStaff.findUnique({
      where: {
        tournamentId_userId_role: {
          tournamentId,
          userId: user.id,
          role: dto.role,
        },
      },
    });

    if (existingStaff) {
      if (existingStaff.status === StaffStatus.ACCEPTED) {
        throw new ConflictException('Người dùng này đã là nhân sự của giải đấu với vai trò này');
      }
      return this.prisma.tournamentStaff.update({
        where: { id: existingStaff.id },
        data: { status: StaffStatus.ACCEPTED, acceptedAt: new Date() },
      });
    }

    const staff = await this.prisma.tournamentStaff.create({
      data: {
        tournamentId,
        userId: user.id,
        role: dto.role,
        status: StaffStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: inviterUserId,
        tournamentId,
        action: 'STAFF_INVITED',
        entityType: 'TOURNAMENT_STAFF',
        entityId: staff.id,
        newValue: { targetUserEmail: dto.email, role: dto.role },
      },
    });

    return staff;
  }

  async revokeStaff(tournamentId: string, staffId: string, operatorUserId: string) {
    const staff = await this.prisma.tournamentStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.tournamentId !== tournamentId) {
      throw new NotFoundException('Không tìm thấy nhân sự trong giải đấu này');
    }

    // Check if tournament creator
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { createdBy: true },
    });

    if (tournament && tournament.createdBy === staff.userId) {
      throw new BadRequestException('Không thể thu hồi quyền của Trưởng Ban Tổ Chức (Người tạo giải)');
    }

    const deleted = await this.prisma.tournamentStaff.delete({
      where: { id: staffId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: operatorUserId,
        tournamentId,
        action: 'STAFF_REVOKED',
        entityType: 'TOURNAMENT_STAFF',
        entityId: staffId,
        oldValue: { userId: staff.userId, role: staff.role },
      },
    });

    return deleted;
  }
}

