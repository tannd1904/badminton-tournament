import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffRole } from '@prisma/client';

@Injectable()
export class TournamentStaffGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Yêu cầu xác thực tài khoản');
    }

    // Super Admin has universal access
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const tournamentId =
      request.params.tournamentId ||
      request.params.id ||
      request.body.tournamentId ||
      request.query.tournamentId;

    if (!tournamentId) {
      throw new BadRequestException('Không tìm thấy mã giải đấu (tournamentId)');
    }

    // Check if user is staff of this tournament
    const staff = await this.prisma.tournamentStaff.findFirst({
      where: {
        tournamentId: String(tournamentId),
        userId: user.id,
        status: 'ACCEPTED',
      },
    });

    if (!staff) {
      // Check if user is the tournament creator
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: String(tournamentId) },
        select: { createdBy: true },
      });

      if (tournament && tournament.createdBy === user.id) {
        return true;
      }

      throw new ForbiddenException(
        'Bạn không phải là thành viên Ban Tổ Chức của giải đấu này',
      );
    }

    request.tournamentStaffRole = staff.role;
    return true;
  }
}

