import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CourtStatus } from '@prisma/client';

export class CreateCourtDto {
  @IsString({ message: 'Tên sân phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên sân không được để trống' })
  name: string;

  @IsOptional()
  @IsInt()
  courtOrder?: number;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsEnum(CourtStatus)
  status?: CourtStatus;
}

