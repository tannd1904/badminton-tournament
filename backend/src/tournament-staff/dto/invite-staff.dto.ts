import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class InviteStaffDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsEnum(StaffRole, { message: 'Vai trò phải là ORGANIZER hoặc REFEREE' })
  role: StaffRole;
}

