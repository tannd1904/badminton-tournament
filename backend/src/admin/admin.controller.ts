import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TournamentStatus, UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  async getAnalytics() {
    const data = await this.adminService.getSystemAnalytics();
    return {
      message: 'Lấy thống kê hệ thống thành công',
      data,
    };
  }

  @Get('tournaments')
  async getTournaments(@Query('status') status?: TournamentStatus) {
    const data = await this.adminService.getTournamentsForModeration(status);
    return {
      message: 'Lấy danh sách giải đấu kiểm duyệt thành công',
      data,
    };
  }

  @Patch('tournaments/:id/moderate')
  async moderateTournament(
    @Param('id') tournamentId: string,
    @Body('status') status: TournamentStatus,
    @Body('reason') reason: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    const data = await this.adminService.moderateTournament(
      tournamentId,
      status,
      reason,
      adminUserId,
    );
    return {
      message: 'Kiểm duyệt giải đấu thành công',
      data,
    };
  }

  @Get('users')
  async getUsers(
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    const data = await this.adminService.getUsersList({ role, search });
    return {
      message: 'Lấy danh sách người dùng thành công',
      data,
    };
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') adminUserId: string,
  ) {
    const data = await this.adminService.updateUserStatus(
      userId,
      isActive,
      adminUserId,
    );
    return {
      message: 'Cập nhật trạng thái người dùng thành công',
      data,
    };
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body('role') role: UserRole,
    @CurrentUser('id') adminUserId: string,
  ) {
    const data = await this.adminService.updateUserRole(
      userId,
      role,
      adminUserId,
    );
    return {
      message: 'Cập nhật vai trò người dùng thành công',
      data,
    };
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    const data = await this.adminService.getAuditLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      entityType,
      action,
    );
    return {
      message: 'Lấy lịch sử audit logs thành công',
      data,
    };
  }
}

