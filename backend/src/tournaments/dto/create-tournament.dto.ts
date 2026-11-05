import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TournamentVisibility } from '@prisma/client';

export class CreateTournamentDto {
  @IsString({ message: 'Tên giải đấu phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên giải đấu không được để trống' })
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString({ message: 'Mã môn thể thao không được để trống' })
  @IsNotEmpty({ message: 'Vui lòng chọn môn thể thao' })
  sportId: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email liên hệ không hợp lệ' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  ruleContent?: string;

  @IsOptional()
  @IsString()
  ruleAttachmentUrl?: string;

  @IsDateString({}, { message: 'Ngày mở đăng ký không đúng định dạng ISO date' })
  registrationOpenAt: string;

  @IsDateString({}, { message: 'Ngày đóng đăng ký không đúng định dạng ISO date' })
  registrationCloseAt: string;

  @IsDateString({}, { message: 'Ngày bắt đầu giải không đúng định dạng ISO date' })
  tournamentStartAt: string;

  @IsDateString({}, { message: 'Ngày kết thúc giải không đúng định dạng ISO date' })
  tournamentEndAt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEventsPerPlayer?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  matchIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  defaultMatchDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCourts?: number;

  @IsOptional()
  @IsEnum(TournamentVisibility)
  visibility?: TournamentVisibility;
}

